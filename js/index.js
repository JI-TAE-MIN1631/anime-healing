// js/index.js

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('anime-grid');
    const spinner = document.getElementById('loading-spinner');

    // 카드 렌더링 함수 (기존과 동일)
    function renderCards(animeList) {
        grid.innerHTML = ''; 
        if (!animeList || animeList.length === 0) {
            grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">추천할 작품이 없습니다.</p>';
            return;
        }

        animeList.forEach(anime => {
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
                    <button class="heart-btn" data-id="${anime.mal_id}">🤍</button>
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

        // 하트(보고싶다) 버튼 로직 -> 진짜 API(POST /api/watchlist) 호출로 변경
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

    // 🚀 백엔드 통신 로직
    async function loadAnimeList() {
        spinner.classList.remove('hidden'); // 로딩 시작
        try {
            // 백엔드 API 주소 (팀원과 협의 후 수정 가능)
            const data = await apiFetch('/api/recommend', 'GET');
            renderCards(data);
        } catch (error) {
            console.error(error);
            showToast('추천 목록을 불러오지 못했습니다. 백엔드 서버를 확인하세요.', 'error');
        } finally {
            spinner.classList.add('hidden'); // 로딩 끝
        }
    }

    loadAnimeList();
});