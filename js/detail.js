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

    // 🚀 [보안 핵심] 리뷰 렌더링 시 XSS(해킹) 방어 적용
    function renderReviews(reviews) {
        reviewList.innerHTML = ''; 
        if (!reviews || reviews.length === 0) {
            reviewList.innerHTML = '<p style="text-align:center; padding: 20px;">아직 리뷰가 없습니다. 첫 리뷰를 작성해 보세요!</p>';
            return;
        }
        reviews.forEach(review => {
            const div = document.createElement('div');
            div.className = 'review-item';
            
            // 1. 뼈대만 innerHTML로 잡고 내용물은 비워둡니다.
            div.innerHTML = `
                <div class="review-item-header">
                    <span class="reviewer-name">👤 <span class="safe-author"></span></span>
                    <span class="review-date">${review.date}</span>
                </div>
                <div class="review-item-score">⭐ ${review.score}점</div>
                <div class="review-item-content safe-content"></div>
            `;
            
            // 2. 사용자가 입력한 데이터는 반드시 textContent로 넣어서 문자로만 취급!
            div.querySelector('.safe-author').textContent = review.author || '익명';
            div.querySelector('.safe-content').textContent = review.content;

            reviewList.appendChild(div);
        });
    }

    async function loadDetail() {
        try {
            const data = await apiFetch(`/api/anime/${malId}`, 'GET');
            
            poster.src = data.image_url || '';
            title.innerText = data.title || '제목 없음';
            score.innerText = `⭐ ${data.score ? data.score.toFixed(1) : '0.0'}`;
            synopsis.innerText = data.synopsis || '줄거리 정보가 없습니다.';
            aiSummary.innerText = data.ai_summary || 'AI 요약 데이터가 없습니다.';
            
            document.getElementById('stat-avg-score').innerText = data.stats?.avg_score || '0.0';
            document.getElementById('stat-total-reviews').innerText = data.stats?.total_reviews || '0';

            genresWrap.innerHTML = '';
            (data.genres || []).forEach(genre => {
                const span = document.createElement('span');
                span.className = 'badge genre-badge';
                span.innerText = genre;
                genresWrap.appendChild(span);
            });

            renderReviews(data.reviews || []);
            
            if (data.is_watchlisted) {
                watchlistBtn.classList.add('active');
                watchlistBtn.innerHTML = '❤️ 보고싶다 취소';
            }
        } catch (error) {
            console.error(error);
            showToast('작품 정보를 불러오지 못했습니다.', 'error');
        }
    }

    loadDetail();

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

    // 🚀 [추가됨] 리뷰 등록 시 유효성 검사 추가
    const reviewForm = document.getElementById('review-form');
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const reviewScore = document.getElementById('review-score').value;
        const reviewContent = document.getElementById('review-content').value.trim();
        
        // 방어: 빈칸만 치고 등록 누르면 막기
        if (!reviewContent) {
            showToast("리뷰 내용을 한 글자 이상 입력해 주세요.", "error");
            return;
        }
        
        try {
            await apiFetch(`/api/reviews`, 'POST', {
                mal_id: malId,
                score: parseInt(reviewScore),
                content: reviewContent
            });
            showToast("리뷰가 성공적으로 등록되었습니다! 🎉", 'success');
            reviewForm.reset();
            loadDetail(); 
        } catch (error) {
            showToast("리뷰 등록에 실패했습니다.", "error");
        }
    });
});