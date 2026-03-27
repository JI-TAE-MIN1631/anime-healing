document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('anime-grid');
    const spinner = document.getElementById('loading-spinner');

    function renderCards(animeList) {
        grid.innerHTML = ''; 
        if (!animeList || animeList.length === 0) {
            grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">추천 작품이 없습니다.</p>';
            return;
        }

        animeList.forEach(anime => {
            const card = document.createElement('div');
            card.className = 'anime-card';
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.heart-btn')) { window.location.href = `detail.html?mal_id=${anime.mal_id}`; }
            });

            // 장르가 리스트인지 문자열인지 방어 코드 추가
            const genresStr = Array.isArray(anime.genres) ? anime.genres.join(', ') : '장르 정보 없음';
            const scoreStr = anime.score ? anime.score.toFixed(1) : '0.0';

            const displayTitle = anime.title_kr || anime.title;
            card.innerHTML = `
                <div class="card-image-wrap">
                    <img src="${anime.image_url}" alt="${displayTitle}" class="card-image" onerror="onImgError(this)">
                    <button class="heart-btn" data-id="${anime.mal_id}">🤍</button>
                </div>
                <div class="card-content">
                    <h4 class="card-title">${displayTitle}</h4>
                    <div class="card-meta">
                        <span class="card-score">⭐ ${scoreStr}</span>
                        <span class="card-genres">${genresStr}</span>
                    </div>
                    <div class="ai-comment">🤖 <strong>AI 추천:</strong><br>${anime.ai_comment || '코멘트 없음'}</div>
                </div>
            `;
            grid.appendChild(card);
        });

        // 🚀 [API 연동] 보고싶다 토글 (백엔드가 POST 하나로 삭제/추가를 모두 처리함)
        document.querySelectorAll('.heart-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const animeId = parseInt(btn.dataset.id);
                try {
                    const response = await apiFetch('/watchlist', 'POST', { mal_id: animeId });
                    if (response.data.action === "added") {
                        btn.classList.add('active'); btn.innerText = '❤️';
                        showToast('목록에 추가되었습니다!', 'success', 'top-center');
                    } else {
                        btn.classList.remove('active'); btn.innerText = '🤍';
                        showToast('목록에서 제거되었습니다.', 'info', 'top-center');
                    }
                } catch (error) {
                    showToast('요청 실패', 'error', 'top-center');
                }
            });
        });
    }

    // 🚀 [API 연동] 필터 요약 바 업데이트
    async function loadFilterSummary() {
        try {
            const [prefRes, genreRes] = await Promise.all([
                apiFetch('/users/me/preferences', 'GET'),
                apiFetch('/genres', 'GET'),
            ]);
            const prefs = prefRes.data;
            const allGenres = genreRes.data;
            const container = document.querySelector('.filter-summary .tags-container');
            if (!container) return;

            container.innerHTML = '';

            const scoreMin = prefs.score_min != null ? prefs.score_min.toFixed(1) : '0.0';
            const scoreMax = prefs.score_max != null ? prefs.score_max.toFixed(1) : '10.0';
            const scoreBadge = document.createElement('span');
            scoreBadge.className = 'badge score-badge';
            scoreBadge.textContent = `⭐ ${scoreMin} ~ ${scoreMax} 점`;
            container.appendChild(scoreBadge);

            if (prefs.genres && prefs.genres.length > 0) {
                const genreMap = Object.fromEntries(allGenres.map(g => [g.id, g.name]));
                prefs.genres.forEach(id => {
                    const badge = document.createElement('span');
                    badge.className = 'badge genre-badge';
                    badge.textContent = genreMap[id] || id;
                    container.appendChild(badge);
                });
            }
        } catch (e) {
            // 취향 미설정 시 무시 (기본 하드코딩 뱃지 대신 비워둠)
            const container = document.querySelector('.filter-summary .tags-container');
            if (container) container.innerHTML = '<span class="badge">취향 설정을 먼저 해주세요</span>';
        }
    }

    // 🚀 [API 연동] 추천 목록 가져오기
    async function loadAnimeList() {
        spinner.classList.remove('hidden'); 
        try {
            const response = await apiFetch('/anime/recommend', 'GET');
            renderCards(response.data); 
        } catch (error) {
            if (error.message && error.message.includes('취향 설정')) {
                showToast('취향 설정이 필요합니다. 이동합니다...', 'info', 'top-center');
                setTimeout(() => { window.location.href = 'preferences.html'; }, 1500);
            } else {
                showToast(error.message || '추천 목록을 불러오지 못했습니다.', 'error', 'top-center');
            }
        } finally {
            spinner.classList.add('hidden'); 
        }
    }
    loadFilterSummary();
    loadAnimeList();
});