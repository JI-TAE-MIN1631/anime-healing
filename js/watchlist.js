document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('watchlist-grid');
    const emptyState = document.getElementById('empty-state');

    function renderWatchlist(animeList) {
        grid.innerHTML = '';
        if (!animeList || animeList.length === 0) {
            emptyState.classList.remove('hidden'); grid.classList.add('hidden'); return;
        } else {
            emptyState.classList.add('hidden'); grid.classList.remove('hidden');
        }

        animeList.forEach(anime => {
            const card = document.createElement('div'); card.className = 'anime-card';
            const displayTitle = anime.title_kr || anime.title;
            card.innerHTML = `
                <div class="card-image-wrap">
                    <img src="${anime.image_url}" alt="${displayTitle}" class="card-image" onerror="onImgError(this)">
                    <button class="delete-btn" data-id="${anime.mal_id}">🗑️</button>
                </div>
                <div class="card-content">
                    <h4 class="card-title">${displayTitle}</h4>
                    <div class="card-meta">
                        <span class="card-score">⭐ ${anime.score ? anime.score.toFixed(1) : '0.0'}</span>
                    </div>
                </div>
            `;
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-btn')) window.location.href = `detail.html?mal_id=${anime.mal_id}`;
            });
            grid.appendChild(card);
        });

        // 🚀 [API 연동] 휴지통 버튼으로 삭제
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idToDelete = parseInt(btn.dataset.id);
                try {
                    await apiFetch(`/api/watchlist/${idToDelete}`, 'DELETE');
                    showToast('목록에서 삭제되었습니다.', 'info');
                    loadWatchlist();
                } catch (error) { showToast('삭제 실패', 'error'); }
            });
        });
    }

    // 🚀 [API 연동] 찜 목록 가져오기
    async function loadWatchlist() {
        try {
            const response = await apiFetch('/api/watchlist', 'GET');
            renderWatchlist(response.data);
        } catch (error) { renderWatchlist([]); }
    }
    loadWatchlist();
});