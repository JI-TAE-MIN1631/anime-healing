// js/detail.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const malId = urlParams.get('mal_id');

    if (!malId) {
        showToast("잘못된 접근입니다.", "error");
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        return;
    }

    const poster = document.getElementById('detail-poster');
    const title = document.getElementById('detail-title');
    const score = document.getElementById('detail-score');
    const synopsis = document.getElementById('detail-synopsis');
    const aiSummary = document.getElementById('detail-ai-summary');
    const genresWrap = document.getElementById('detail-genres');
    const reviewList = document.getElementById('review-list');
    const watchlistBtn = document.getElementById('detail-watchlist-btn');

    // 현재 로그인한 유저 ID
    const currentUserId = parseInt(localStorage.getItem('user_id'));

    // 현재 정렬 상태
    let currentSort = 'latest';

    // ============================
    // 커스텀 모달 시스템
    // ============================

    // 모달 HTML을 body에 삽입 (페이지 로드 시 한 번만)
    function createModalContainer() {
        if (document.getElementById('custom-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'custom-modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box" id="custom-modal-box">
                <h3 class="modal-title" id="modal-title">모달 제목</h3>
                <div class="modal-body" id="modal-body"></div>
                <div class="modal-footer" id="modal-footer"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        // 오버레이 클릭 시 닫기
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
    }
    createModalContainer();

    function openModal() {
        document.getElementById('custom-modal-overlay').classList.add('active');
    }

    function closeModal() {
        document.getElementById('custom-modal-overlay').classList.remove('active');
    }

    // 리뷰 수정 모달 열기 (별점 + 내용 모두 수정 가능)
    function openEditModal(currentScore, currentContent) {
        document.getElementById('modal-title').textContent = '✏️ 리뷰 수정';

        // 별점 선택 옵션 생성
        let scoreOptions = '';
        for (let i = 10; i >= 1; i--) {
            const label = i === 10 ? '10점 (완벽해요!)' : i === 5 ? '5점 (보통이에요)' : i === 1 ? '1점 (별로예요)' : `${i}점`;
            const selected = i === Math.round(currentScore) ? 'selected' : '';
            scoreOptions += `<option value="${i}" ${selected}>${label}</option>`;
        }

        document.getElementById('modal-body').innerHTML = `
            <div class="modal-field">
                <label for="edit-score">평점</label>
                <select id="edit-score" class="modal-select">${scoreOptions}</select>
            </div>
            <div class="modal-field">
                <label for="edit-content">리뷰 내용</label>
                <textarea id="edit-content" class="modal-textarea" placeholder="리뷰를 수정해주세요 (5자 이상)">${currentContent}</textarea>
            </div>
        `;

        document.getElementById('modal-footer').innerHTML = `
            <button class="modal-btn modal-btn-cancel" id="modal-cancel">취소</button>
            <button class="modal-btn modal-btn-confirm" id="modal-confirm">수정 완료</button>
        `;

        openModal();

        document.getElementById('modal-cancel').addEventListener('click', closeModal);
        document.getElementById('modal-confirm').addEventListener('click', () => {
            const newScore = document.getElementById('edit-score').value;
            const newContent = document.getElementById('edit-content').value.trim();
            if (!newContent || newContent.length < 5) {
                showToast('리뷰는 5자 이상이어야 합니다.', 'error');
                return;
            }
            closeModal();
            updateReview(parseFloat(newScore), newContent);
        });
    }

    // 삭제 확인 모달 열기
    function openDeleteModal() {
        document.getElementById('modal-title').textContent = '🗑️ 리뷰 삭제';
        document.getElementById('modal-body').innerHTML = `
            <p class="modal-message">정말 리뷰를 삭제하시겠습니까?<br><span style="color:#ff4757; font-size:0.85rem;">삭제된 리뷰는 복구할 수 없습니다.</span></p>
        `;
        document.getElementById('modal-footer').innerHTML = `
            <button class="modal-btn modal-btn-cancel" id="modal-cancel">취소</button>
            <button class="modal-btn modal-btn-danger" id="modal-confirm">삭제</button>
        `;

        openModal();

        document.getElementById('modal-cancel').addEventListener('click', closeModal);
        document.getElementById('modal-confirm').addEventListener('click', () => {
            closeModal();
            deleteReview();
        });
    }

    // ============================
    // 리뷰 렌더링
    // ============================

    function renderReviews(reviews) {
        reviewList.innerHTML = ''; 
        let hasMyReview = false;

        if (!reviews || reviews.length === 0) {
            reviewList.innerHTML = '<p style="text-align:center; padding: 20px;">아직 리뷰가 없습니다. 첫 리뷰를 작성해 보세요!</p>';
            toggleReviewForm(false);
            return;
        }

        reviews.forEach(review => {
            const isMyReview = review.user_id === currentUserId;
            if (isMyReview) hasMyReview = true;

            const div = document.createElement('div');
            div.className = 'review-item';
            
            let actionBtns = '';
            if (isMyReview) {
                actionBtns = `
                    <div class="review-actions">
                        <button class="btn-edit-review" data-score="${review.score}">✏️ 수정</button>
                        <button class="btn-delete-review">🗑️ 삭제</button>
                    </div>
                `;
            }

            div.innerHTML = `
                <div class="review-item-header">
                    <span class="reviewer-name">👤 <span class="safe-author"></span>${isMyReview ? ' <span class="my-review-badge">(내 리뷰)</span>' : ''}</span>
                    <span class="review-date">${review.created_at || ''}</span>
                </div>
                <div class="review-item-score">⭐ ${review.score}점</div>
                <div class="review-item-content safe-content"></div>
                ${actionBtns}
            `;
            
            // XSS 방어
            div.querySelector('.safe-author').textContent = review.nickname || '익명';
            div.querySelector('.safe-content').textContent = review.content;

            // 커스텀 수정 모달 열기
            const editBtn = div.querySelector('.btn-edit-review');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    openEditModal(review.score, review.content);
                });
            }

            // 커스텀 삭제 모달 열기
            const deleteBtn = div.querySelector('.btn-delete-review');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    openDeleteModal();
                });
            }

            reviewList.appendChild(div);
        });

        toggleReviewForm(hasMyReview);
    }

    function toggleReviewForm(hasMyReview) {
        const reviewForm = document.getElementById('review-form');
        if (hasMyReview) {
            reviewForm.style.display = 'none';
        } else {
            reviewForm.style.display = '';
        }
    }

    // ============================
    // API 호출 함수들
    // ============================

    async function updateReview(score, content) {
        try {
            await apiFetch(`/api/anime/${malId}/reviews`, 'PUT', {
                score: score,
                content: content
            });
            showToast('리뷰가 수정되었습니다! ✏️', 'success');
            loadReviews();
            loadReviewStats();
        } catch (error) {
            showToast('리뷰 수정에 실패했습니다.', 'error');
        }
    }

    async function deleteReview() {
        try {
            await apiFetch(`/api/anime/${malId}/reviews`, 'DELETE');
            showToast('리뷰가 삭제되었습니다.', 'info');
            loadReviews();
            loadReviewStats();
        } catch (error) {
            showToast('리뷰 삭제에 실패했습니다.', 'error');
        }
    }

    async function loadDetail() {
        try {
            const result = await apiFetch(`/api/anime/${malId}`, 'GET');
            const data = result.data;
            
            poster.src = data.image_url || '';
            title.innerText = data.title || '제목 없음';
            score.innerText = `⭐ ${data.score ? data.score.toFixed(1) : '0.0'}`;
            synopsis.innerText = data.synopsis_kr || data.synopsis || '줄거리 정보가 없습니다.';

            genresWrap.innerHTML = '';
            (data.genres || []).forEach(genre => {
                const span = document.createElement('span');
                span.className = 'badge genre-badge';
                span.innerText = genre;
                genresWrap.appendChild(span);
            });

            if (data.is_watchlisted) {
                watchlistBtn.classList.add('active');
                watchlistBtn.innerHTML = '❤️ 보고싶다 취소';
            }
        } catch (error) {
            console.error(error);
            showToast('작품 정보를 불러오지 못했습니다.', 'error');
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
            const result = await apiFetch(`/api/anime/${malId}/reviews/stats`, 'GET');
            const stats = result.data;
            document.getElementById('stat-avg-score').innerText = stats?.avg_score || '0.0';
            document.getElementById('stat-total-reviews').innerText = stats?.review_count || '0';
        } catch (error) {
            console.error('통계 로딩 실패:', error);
        }
    }

    async function loadAiSummary() {
        try {
            const result = await apiFetch(`/api/anime/${malId}/summary`, 'GET');
            aiSummary.innerText = result.data?.summary || 'AI 요약 데이터가 없습니다.';
        } catch (error) {
            aiSummary.innerText = 'AI 요약 데이터가 없습니다.';
        }
    }

    // ============================
    // 정렬 버튼 (최신순 / 평점순)
    // ============================

    const sortBtns = document.querySelectorAll('.sort-btn');
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 활성 상태 토글
            sortBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 버튼 텍스트로 정렬 기준 판별
            if (btn.textContent.includes('평점')) {
                currentSort = 'score';
            } else {
                currentSort = 'latest';
            }
            loadReviews();
        });
    });

    // ============================
    // 초기 로드
    // ============================

    loadDetail();
    loadReviews();
    loadReviewStats();
    loadAiSummary();

    // ============================
    // 보고싶다 버튼
    // ============================

    watchlistBtn.addEventListener('click', async () => {
        try {
            if (watchlistBtn.classList.contains('active')) {
                await apiFetch(`/api/watchlist/${malId}`, 'DELETE');
                watchlistBtn.classList.remove('active');
                watchlistBtn.innerHTML = '🤍 보고싶다';
                showToast('목록에서 취소되었습니다.', 'info');
            } else {
                await apiFetch(`/api/watchlist`, 'POST', { mal_id: malId });
                watchlistBtn.classList.add('active');
                watchlistBtn.innerHTML = '❤️ 보고싶다 취소';
                showToast('목록에 담겼습니다!', 'success');
            }
        } catch (error) {
            showToast('처리에 실패했습니다.', 'error');
        }
    });

    // ============================
    // 리뷰 등록 폼
    // ============================

    const reviewForm = document.getElementById('review-form');
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const reviewScore = document.getElementById('review-score').value;
        const reviewContent = document.getElementById('review-content').value.trim();
        
        if (!reviewContent || reviewContent.length < 5) {
            showToast("리뷰 내용을 5자 이상 입력해 주세요.", "error");
            return;
        }
        
        try {
            await apiFetch(`/api/anime/${malId}/reviews`, 'POST', {
                score: parseFloat(reviewScore),
                content: reviewContent
            });
            showToast("리뷰가 성공적으로 등록되었습니다! 🎉", 'success');
            reviewForm.reset();
            loadReviews();
            loadReviewStats();
        } catch (error) {
            showToast("리뷰 등록에 실패했습니다.", "error");
        }
    });
});