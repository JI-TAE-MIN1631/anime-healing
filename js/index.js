// js/index.js

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('anime-grid');
    const spinner = document.getElementById('loading-spinner');

    // 카드 렌더링 함수 (찜 목록 정보를 인자로 받도록 수정)
    function renderCards(animeList, watchlistSet = new Set()) {
        grid.innerHTML = '';
        if (!animeList || animeList.length === 0) {
            grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">추천할 작품이 없습니다.</p>';
            return;
        }

        animeList.forEach(anime => {
            // 현재 렌더링하는 카드가 찜 목록에 있는지 확인
            const isWatchlisted = watchlistSet.has(anime.mal_id);

            const card = document.createElement('div');
            card.className = 'anime-card';
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.heart-btn')) {
                    window.location.href = `detail.html?mal_id=${anime.mal_id}`;
                }
            });

            card.innerHTML = `
                <div class="card-image-wrap">
                    <img src="${anime.image_url}" alt="${anime.title}" class="card-image">
                    <button class="heart-btn ${isWatchlisted ? 'active' : ''}" data-id="${anime.mal_id}">
                        ${isWatchlisted ? '❤️' : '🤍'}
                    </button>
                </div>
                <div class="card-content">
                    <h4 class="card-title">${anime.title}</h4>
                    <div class="card-meta">
                        <span class="card-score">⭐ ${anime.score.toFixed(1)}</span>
                        <span class="card-genres">${anime.genres.join(', ')}</span>
                    </div>
                    <div class="ai-comment">
                        🤖 <strong>AI 추천:</strong><br>
                        ${anime.ai_comment || '추천 코멘트가 없습니다.'}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // 하트(보고싶다) 버튼 클릭 로직 (기존과 동일)
        document.querySelectorAll('.heart-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const animeId = btn.dataset.id;
                try {
                    if (btn.classList.contains('active')) {
                        await apiFetch(`/api/watchlist/${animeId}`, 'DELETE');
                        btn.classList.remove('active');
                        btn.innerText = '🤍';
                        showToast('보고싶다 목록에서 제거되었습니다.', 'info');
                    } else {
                        await apiFetch(`/api/watchlist`, 'POST', { mal_id: animeId });
                        btn.classList.add('active');
                        btn.innerText = '❤️';
                        showToast('보고싶다 목록에 추가되었습니다!', 'success');
                    }
                } catch (error) {
                    showToast('요청 처리에 실패했습니다.', 'error');
                }
            });
        });
    }

    // 장르 ID → 한국어 이름 매핑 (백엔드 genres.py와 동일)
    const GENRE_MAP = {
        1: '액션', 2: '어드벤처', 4: '코미디', 5: '아방가르드',
        7: '미스터리', 8: '드라마', 10: '판타지', 11: '게임',
        13: '역사', 14: '호러', 17: '무술', 18: '메카', 19: '음악',
        22: '로맨스', 23: '학원', 24: 'SF', 25: '소년', 36: '일상',
        37: '초자연', 38: '밀리터리', 39: '경찰', 40: '심리',
        41: '스릴러', 42: '소녀', 43: '청년', 46: '수상스포츠',
        47: '소년(성인)', 48: '서스펜스'
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

            // 장르 ID 배열을 한국어 이름으로 변환하여 배지 생성
            (pref.genres || []).forEach(genreId => {
                const name = GENRE_MAP[genreId] || `장르#${genreId}`;
                html += `<span class="badge genre-badge">${name}</span>`;
            });

            filterTags.innerHTML = html;
        } catch (error) {
            filterTags.innerHTML = '<span class="badge score-badge">필터 정보를 불러올 수 없습니다.</span>';
        }
    }

    // 🚀 [수정됨] 찜 목록과 추천 목록을 순서대로 불러오는 로직
    async function loadData() {
        spinner.classList.remove('hidden');
        try {
            // 1. 찜 목록 먼저 가져오기
            const watchlistResult = await apiFetch('/api/watchlist', 'GET');
            const watchlistIds = new Set((watchlistResult.data || []).map(item => item.mal_id));

            // 2. 추천 목록 가져오기
            const recommendResult = await apiFetch('/api/anime/recommend', 'GET');

            // 3. 찜 목록 정보와 함께 카드 렌더링
            renderCards(recommendResult.data, watchlistIds);

        } catch (error) {
            console.error(error);
            showToast('데이터를 불러오지 못했습니다. 서버를 확인하세요.', 'error');
            grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">추천 목록을 불러올 수 없습니다.</p>';
        } finally {
            spinner.classList.add('hidden');
        }
    }

    loadFilterBadges();
    loadData(); // 기존 loadAnimeList() 대신 호출
});