document.addEventListener('DOMContentLoaded', () => {
    const malId = new URLSearchParams(window.location.search).get('mal_id');
    if (!malId) { showToast("잘못된 접근입니다.", "error"); setTimeout(() => window.location.href = 'index.html', 1000); return; }

    // localStorage에서 직접 가져오기
    let currentUserId = null;
    try {
        const storedId = localStorage.getItem('user_id');
        if (storedId) {
            currentUserId = parseInt(storedId);
        }
    } catch (e) { }

    let currentSort = 'latest';
    const watchlistBtn = document.getElementById('detail-watchlist-btn');

    // 🚀 여러 백엔드 API 데이터를 모아서 화면을 그림
    async function loadDetail() {
        try {
            const [detailRes, statsRes, watchlistRes] = await Promise.all([
                apiFetch(`/api/anime/${malId}`, 'GET'),
                apiFetch(`/api/anime/${malId}/reviews/stats`, 'GET'),
                apiFetch(`/api/watchlist`, 'GET').catch(() => ({ data: [] }))
            ]);

            const anime = detailRes.data;
            const stats = statsRes.data;
            const watchlist = watchlistRes.data || [];
            const isWatchlisted = watchlist.some(item => item.mal_id === parseInt(malId));

            // 데이터 렌더링
            const posterEl = document.getElementById('detail-poster');
            posterEl.src = anime.image_url_large || anime.image_url || '';
            posterEl.onerror = () => { posterEl.onerror = null; posterEl.style.background = '#2d2d44'; posterEl.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; };
            document.getElementById('detail-title').innerText = anime.title_kr || anime.title || '제목 없음';
            document.getElementById('detail-score').innerText = `⭐ ${anime.score ? anime.score.toFixed(1) : '0.0'}`;
            document.getElementById('detail-synopsis').innerText = anime.synopsis_kr || '줄거리 정보가 없습니다.';

            document.getElementById('stat-avg-score').innerText = stats.avg_score.toFixed(1);
            document.getElementById('stat-total-reviews').innerText = stats.review_count;

            // 장르 렌더링
            const genresWrap = document.getElementById('detail-genres');
            genresWrap.innerHTML = '';
            (anime.genres || []).forEach(g => {
                const span = document.createElement('span'); span.className = 'badge genre-badge'; span.innerText = g.name || g;
                genresWrap.appendChild(span);
            });

            if (isWatchlisted) {
                watchlistBtn.classList.add('active');
                watchlistBtn.innerHTML = '❤️ 보고싶다 취소';
            } else {
                watchlistBtn.classList.remove('active');
                watchlistBtn.innerHTML = '🤍 보고싶다';
            }
        } catch (error) { showToast('작품 정보를 불러오지 못했습니다.', 'error'); return; }

        // AI 요약은 독립적으로 로드
        try {
            const summaryRes = await apiFetch(`/api/anime/${malId}/summary`, 'GET');
            document.getElementById('detail-ai-summary').innerText =
                summaryRes.data?.summary || 'AI 요약 데이터가 없습니다. (리뷰 3개 이상 필요)';
        } catch (e) {
            document.getElementById('detail-ai-summary').innerText = 'AI 요약을 불러올 수 없습니다.';
        }
    }

    // 정렬 파라미터를 쿼리스트링으로 전달하여 리뷰 로드
    async function loadReviews() {
        try {
            const result = await apiFetch(`/api/anime/${malId}/reviews?sort=${currentSort}`, 'GET');
            renderReviews(result.data || []);
        } catch (error) {
            console.error('리뷰 로딩 실패:', error);
            renderReviews([]);
        }
    }

    async function loadReviewStats() {
        try {
            const statsRes = await apiFetch(`/api/anime/${malId}/reviews/stats`, 'GET');
            const stats = statsRes.data;
            document.getElementById('stat-avg-score').innerText = stats?.avg_score || '0.0';
            document.getElementById('stat-total-reviews').innerText = stats?.review_count || '0';
        } catch (e) { console.error('통계 로딩 실패:', e); }
    }

    function renderReviews(reviews) {
        const reviewList = document.getElementById('review-list');
        reviewList.innerHTML = '';

        let hasMyReview = false;

        if (!reviews || reviews.length === 0) {
            reviewList.innerHTML = '<p style="text-align:center; padding: 20px;">아직 리뷰가 없습니다. 첫 리뷰를 작성해 보세요!</p>';
            toggleReviewForm(false);
            return;
        }

        reviews.forEach(r => {
            const isOwner = currentUserId && r.user_id === currentUserId;
            if (isOwner) hasMyReview = true;

            const div = document.createElement('div');
            div.className = 'review-item';
            div.dataset.reviewId = r.id;
            div.innerHTML = `
                <div class="review-item-header">
                    <span class="reviewer-name">👤 <span class="safe-author"></span>${isOwner ? ' <span class="my-review-badge">(내 리뷰)</span>' : ''}</span>
                    <div class="review-header-right">
                        <span class="review-date">${r.created_at ? r.created_at.split(' ')[0] : ''}</span>
                        ${isOwner ? `
                        <button class="review-action-btn edit-btn" data-id="${r.id}">✏️ 수정</button>
                        <button class="review-action-btn delete-btn" data-id="${r.id}">🗑️ 삭제</button>
                        ` : ''}
                    </div>
                </div>
                <div class="review-view-mode">
                    <div class="review-item-score">⭐ ${r.score}점</div>
                    <div class="review-item-content safe-content"></div>
                </div>
                ${isOwner ? `
                <div class="review-edit-mode hidden">
                    <div class="edit-score-wrap">
                        <label>평점:</label>
                        <select class="edit-score-select">
                            ${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n =>
                `<option value="${n}" ${r.score == n ? 'selected' : ''}>${n}점</option>`
            ).join('')}
                        </select>
                    </div>
                    <textarea class="edit-content-input"></textarea>
                    <div class="edit-actions">
                        <button class="review-action-btn confirm-edit-btn" data-id="${r.id}">저장</button>
                        <button class="review-action-btn cancel-edit-btn">취소</button>
                    </div>
                </div>
                ` : ''}
            `;
            div.querySelector('.safe-author').textContent = r.nickname || '익명';
            div.querySelector('.safe-content').textContent = r.content;
            if (isOwner) {
                div.querySelector('.edit-content-input').value = r.content;
            }
            reviewList.appendChild(div);
        });

        toggleReviewForm(hasMyReview);

        // 수정 버튼
        reviewList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.review-item');
                item.querySelector('.review-view-mode').classList.add('hidden');
                item.querySelector('.review-edit-mode').classList.remove('hidden');
            });
        });

        // 취소 버튼
        reviewList.querySelectorAll('.cancel-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.review-item');
                item.querySelector('.review-view-mode').classList.remove('hidden');
                item.querySelector('.review-edit-mode').classList.add('hidden');
            });
        });

        // 저장 버튼
        reviewList.querySelectorAll('.confirm-edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reviewId = btn.dataset.id;
                const item = btn.closest('.review-item');
                const score = parseInt(item.querySelector('.edit-score-select').value);
                const content = item.querySelector('.edit-content-input').value.trim();
                if (!content || content.length < 5) {
                    showToast('리뷰 내용을 5자 이상 입력해주세요.', 'error');
                    return;
                }
                try {
                    await apiFetch(`/api/anime/${malId}/reviews/${reviewId}`, 'PUT', { score, content });
                    showToast('리뷰가 수정되었습니다! ✏️', 'success');
                    loadReviews();
                    loadReviewStats();
                } catch (e) { showToast(e.message || '수정 실패', 'error'); }
            });
        });

        // 삭제 버튼
        reviewList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reviewId = btn.dataset.id;
                if (!confirm('리뷰를 삭제하시겠습니까?')) return;
                try {
                    await apiFetch(`/api/anime/${malId}/reviews/${reviewId}`, 'DELETE');
                    showToast('리뷰가 삭제되었습니다.', 'info');
                    loadReviews();
                    loadReviewStats();
                } catch (e) { showToast(e.message || '삭제 실패', 'error'); }
            });
        });
    }

    function toggleReviewForm(hasMyReview) {
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.style.display = hasMyReview ? 'none' : '';
        }
    }

    // 정렬 버튼
    const sortBtns = document.querySelectorAll('.sort-btn');
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sortBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.textContent.includes('평점') ? 'score' : 'latest';
            loadReviews();
        });
    });

    // 초기 로드
    loadDetail();
    loadReviews();

    // 🚀 보고싶다 토글
    watchlistBtn.addEventListener('click', async () => {
        try {
            if (watchlistBtn.classList.contains('active')) {
                await apiFetch(`/api/watchlist/${malId}`, 'DELETE');
                watchlistBtn.classList.remove('active');
                watchlistBtn.innerHTML = '🤍 보고싶다';
                showToast('목록에서 취소되었습니다.', 'info');
            } else {
                await apiFetch(`/api/watchlist`, 'POST', { mal_id: parseInt(malId) });
                watchlistBtn.classList.add('active');
                watchlistBtn.innerHTML = '❤️ 보고싶다 취소';
                showToast('목록에 담겼습니다!', 'success');
            }
        } catch (e) { showToast('처리에 실패했습니다.', 'error'); }
    });

    // 🚀 리뷰 등록
    const reviewForm = document.getElementById('review-form');
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const score = parseInt(document.getElementById('review-score').value);
        const content = document.getElementById('review-content').value.trim();
        if (!content || content.length < 5) return showToast("리뷰 내용을 5자 이상 입력해주세요.", "error");

        try {
            await apiFetch(`/api/anime/${malId}/reviews`, 'POST', { score, content });
            showToast("리뷰가 등록되었습니다! 🎉", 'success');
            reviewForm.reset();
            loadReviews();
            loadReviewStats();
        } catch (error) { showToast(error.message || "리뷰 등록 실패", "error"); }
    });
});
