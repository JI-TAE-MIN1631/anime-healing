document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('anime-grid');
    const spinner = document.getElementById('loading-spinner');
    const loadMoreWrap = document.getElementById('load-more-wrap');
    const loadMoreBtn = document.getElementById('load-more-btn');

    let currentPage = 1;
    let isLoading = false;
    let watchlistIds = new Set();

    // 카드 렌더링 함수 (append: true면 기존 카드에 추가)
    function renderCards(animeList, append = false) {
        if (!append) grid.innerHTML = '';

        if (!animeList || animeList.length === 0) {
            if (!append) {
                grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">추천 작품이 없습니다.</p>';
            }
            loadMoreWrap.classList.add('hidden');
            return;
        }

        animeList.forEach(anime => {
            const isWatchlisted = watchlistIds.has(anime.mal_id);

            const card = document.createElement('div');
            card.className = 'anime-card';
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.heart-btn')) { window.location.href = `detail.html?mal_id=${anime.mal_id}`; }
            });

            const genresStr = Array.isArray(anime.genres) ? anime.genres.join(', ') : '장르 정보 없음';
            const scoreStr = anime.score ? anime.score.toFixed(1) : '0.0';

            const displayTitle = anime.title_kr || anime.title;
            card.innerHTML = `
                <div class="card-image-wrap">
                    <img src="${anime.image_url}" alt="${anime.title}" class="card-image">
                    <button class="heart-btn ${isWatchlisted ? 'active' : ''}" data-id="${anime.mal_id}">
                        ${isWatchlisted ? '❤️' : '🤍'}
                    </button>
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

        // 하트(보고싶다) 버튼 클릭 로직
        grid.querySelectorAll('.heart-btn:not([data-bound])').forEach(btn => {
            btn.setAttribute('data-bound', 'true');
            btn.addEventListener('click', async () => {
                const animeId = parseInt(btn.dataset.id);
                try {
                    const response = await apiFetch('/api/watchlist', 'POST', { mal_id: animeId });
                    if (response.data.action === "added") {
                        btn.classList.add('active'); btn.innerText = '❤️';
                        watchlistIds.add(animeId);
                        showToast('목록에 추가되었습니다!', 'success', 'top-center');
                    } else {
                        btn.classList.remove('active'); btn.innerText = '🤍';
                        watchlistIds.delete(animeId);
                        showToast('목록에서 제거되었습니다.', 'info', 'top-center');
                    }
                } catch (error) {
                    showToast('요청 실패', 'error', 'top-center');
                }
            });
        });

        // 12개 미만이면 더 이상 데이터 없음
        if (animeList.length < 12) {
            loadMoreWrap.classList.add('hidden');
        } else {
            loadMoreWrap.classList.remove('hidden');
        }
    }

    // 장르 ID → 한국어 이름 매핑 (백엔드 genres.py와 동일)
    const GENRE_MAP = {
        1: '액션', 2: '어드벤처', 4: '코미디', 5: '아방가르드',
        7: '미스터리', 8: '드라마', 10: '판타지', 11: '게임',
        13: '역사', 14: '호러', 17: '무술', 18: '메카', 19: '음악',
        22: '로맨스', 23: '학원', 24: 'SF', 25: '쇼조', 36: '일상',
        37: '이세계', 38: '밀리터리', 39: '경찰', 40: '심리',
        41: '스릴러', 42: '소녀', 43: '청년', 46: '수상스포츠',
        47: '소녀(성인)', 48: '서스펜스'
    };

    // 현재 취향 설정을 백엔드에서 가져와 필터 배지 렌더링
    async function loadFilterBadges() {
        const filterTags = document.getElementById('filter-tags');
        try {
            const result = await apiFetch('/api/users/me/preferences', 'GET');
            if (!result.data) {
                filterTags.innerHTML = '<span class="badge score-badge">취향 설정이 없습니다. 취향 변경을 해주세요!</span>';
                return;
            }

            const pref = result.data;
            let html = `<span class="badge score-badge">⭐ ${pref.score_min} ~ ${pref.score_max} 점</span>`;

            (pref.genres || []).forEach(genreId => {
                const name = GENRE_MAP[genreId] || `장르#${genreId}`;
                html += `<span class="badge genre-badge">${name}</span>`;
            });

            filterTags.innerHTML = html;
        } catch (error) {
            filterTags.innerHTML = '<span class="badge score-badge">필터 정보를 불러올 수 없습니다.</span>';
        }
    }

    // 추천 목록 로드 (페이지 지정 가능)
    async function loadRecommend(page = 1, append = false) {
        if (isLoading) return;
        isLoading = true;

        if (!append) spinner.classList.remove('hidden');
        if (append) loadMoreBtn.textContent = '불러오는 중...';

        try {
            const recommendResult = await apiFetch(`/api/anime/recommend?page=${page}`, 'GET');
            renderCards(recommendResult.data, append);
        } catch (error) {
            console.error(error);
            if (!append) {
                showToast('데이터를 불러오지 못했습니다.', 'error');
                grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">추천 목록을 불러올 수 없습니다.</p>';
            } else {
                showToast('더 이상 추천할 작품이 없습니다.', 'info');
                loadMoreWrap.classList.add('hidden');
            }
        } finally {
            spinner.classList.add('hidden');
            loadMoreBtn.textContent = '더 많은 추천 보기';
            isLoading = false;
        }
    }

    // 초기 데이터 로드
    async function loadData() {
        try {
            const watchlistResult = await apiFetch('/api/watchlist', 'GET');
            watchlistIds = new Set((watchlistResult.data || []).map(item => item.mal_id));
        } catch (e) { /* 찜 목록 실패해도 계속 진행 */ }

        await loadRecommend(1, false);
    }

    // 더 보기 버튼
    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        loadRecommend(currentPage, true);
    });

    loadFilterBadges();
    loadData();
});
