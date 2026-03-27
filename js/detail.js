document.addEventListener('DOMContentLoaded', () => {
    const malId = new URLSearchParams(window.location.search).get('mal_id');
    if (!malId) { showToast("잘못된 접근입니다.", "error"); setTimeout(() => window.location.href='index.html', 1000); return; }

    let currentUserId = null;

    // 🚀 여러 백엔드 API 데이터를 모아서 화면을 그림
    async function loadDetail() {
        // 현재 로그인 유저 ID (실패해도 계속 진행)
        try {
            const meRes = await apiFetch('/users/me', 'GET');
            currentUserId = meRes.data.user_id;
        } catch (e) { currentUserId = null; }

        // 필수 데이터 3개 (실패 시 페이지 오류 처리)
        try {
            const [detailRes, reviewsRes, statsRes] = await Promise.all([
                apiFetch(`/anime/${malId}`, 'GET'),
                apiFetch(`/anime/${malId}/reviews`, 'GET'),
                apiFetch(`/anime/${malId}/reviews/stats`, 'GET'),
            ]);

            const anime = detailRes.data;
            const reviews = reviewsRes.data;
            const stats = statsRes.data;

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

            // 리뷰 렌더링
            renderReviews(reviews);
        } catch (error) { showToast('작품 정보를 불러오지 못했습니다.', 'error'); return; }

        // AI 요약은 독립적으로 로드 (Gemini 실패해도 리뷰/상세에 영향 없음)
        try {
            const summaryRes = await apiFetch(`/anime/${malId}/summary`, 'GET');
            document.getElementById('detail-ai-summary').innerText =
                summaryRes.data?.summary || 'AI 요약 데이터가 없습니다. (리뷰 3개 이상 필요)';
        } catch (e) {
            document.getElementById('detail-ai-summary').innerText = 'AI 요약을 불러올 수 없습니다.';
        }
    }

    function renderReviews(reviews) {
        const reviewList = document.getElementById('review-list');
        reviewList.innerHTML = '';
        if (reviews.length === 0) { reviewList.innerHTML = '<p>아직 리뷰가 없습니다.</p>'; return; }

        reviews.forEach(r => {
            const isOwner = currentUserId && r.user_id === currentUserId;
            const div = document.createElement('div');
            div.className = 'review-item';
            div.dataset.reviewId = r.id;
            div.innerHTML = `
                <div class="review-item-header">
                    <span class="reviewer-name">👤 <span class="safe-author"></span></span>
                    <div class="review-header-right">
                        <span class="review-date">${r.created_at.split(' ')[0]}</span>
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
                            ${[10,9,8,7,6,5,4,3,2,1].map(n =>
                                `<option value="${n}" ${r.score == n ? 'selected' : ''}>${n}점</option>`
                            ).join('')}
                        </select>
                    </div>
                    <textarea class="edit-content-input">${''}</textarea>
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
                    await apiFetch(`/anime/${malId}/reviews/${reviewId}`, 'PUT', { score, content });
                    showToast('리뷰가 수정되었습니다! ✏️', 'success');
                    loadDetail();
                } catch (e) { showToast(e.message || '수정 실패', 'error'); }
            });
        });

        // 삭제 버튼
        reviewList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('리뷰를 삭제하시겠습니까?')) return;
                const reviewId = btn.dataset.id;
                try {
                    await apiFetch(`/anime/${malId}/reviews/${reviewId}`, 'DELETE');
                    showToast('리뷰가 삭제되었습니다.', 'info');
                    loadDetail();
                } catch (e) { showToast(e.message || '삭제 실패', 'error'); }
            });
        });
    }

    loadDetail();

    // 🚀 보고싶다 토글
    const watchlistBtn = document.getElementById('detail-watchlist-btn');
    watchlistBtn.addEventListener('click', async () => {
        try {
            const res = await apiFetch('/watchlist', 'POST', { mal_id: parseInt(malId) });
            if (res.data.action === "added") {
                watchlistBtn.classList.add('active'); watchlistBtn.innerHTML = '❤️ 보고싶다 취소';
                showToast('목록에 담겼습니다!', 'success');
            } else {
                watchlistBtn.classList.remove('active'); watchlistBtn.innerHTML = '🤍 보고싶다';
                showToast('목록에서 취소되었습니다.', 'info');
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
            await apiFetch(`/anime/${malId}/reviews`, 'POST', { score, content });
            showToast("리뷰가 등록되었습니다! 🎉", 'success');
            reviewForm.reset();
            loadDetail(); // 리뷰 작성 후 화면 새로고침
        } catch (error) { showToast(error.message || "리뷰 등록 실패", "error"); }
    });
});