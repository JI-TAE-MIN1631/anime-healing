// js/watchlist.js

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('watchlist-grid');
    const emptyState = document.getElementById('empty-state');

    function renderWatchlist(animeList) {
        grid.innerHTML = ''; 

        if (!animeList || animeList.length === 0) {
            emptyState.classList.remove('hidden');
            grid.classList.add('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
            grid.classList.remove('hidden');
        }

        animeList.forEach(anime => {
            const card = document.createElement('div');
            card.className = 'anime-card'; 
            
            card.innerHTML = `
                <div class="card-image-wrap">
                    <img src="${anime.image_url}" alt="${anime.title}" class="card-image">
                    <button class="delete-btn" data-id="${anime.mal_id}">🗑️</button>
                </div>
                <div class="card-content">
                    <h4 class="card-title">${anime.title}</h4>
                    <div class="card-meta">
                        <span class="card-score">⭐ ${anime.score.toFixed(1)}</span>
                        <span class="card-genres">${(anime.genres || []).join(', ')}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-btn')) {
                    window.location.href = `detail.html?mal_id=${anime.mal_id}`;
                }
            });

            grid.appendChild(card);
        });

        // 삭제 로직 (진짜 API 연동)
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idToDelete = btn.dataset.id;
                try {
                    await apiFetch(`/api/watchlist/${idToDelete}`, 'DELETE');
                    showToast('목록에서 삭제되었습니다.', 'info');
                    loadWatchlist(); // 지운 후 목록 다시 불러오기
                } catch (error) {
                    showToast('삭제에 실패했습니다.', 'error');
                }
            });
        });
    }

    // 🚀 [수정됨] 백엔드에서 찜 목록 가져오기
    async function loadWatchlist() {
        try {
            const result = await apiFetch('/api/watchlist', 'GET');
            renderWatchlist(result.data);
        } catch (error) {
            console.error(error);
            showToast('목록을 불러오지 못했습니다.', 'error');
            renderWatchlist([]); // 에러 시 빈 화면 띄우기
        }
    }

    loadWatchlist();
});