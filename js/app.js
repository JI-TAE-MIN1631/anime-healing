// js/app.js

const BASE_URL = "https://api.animehealing.com";

// 이미지 로드 실패 시 빈 투명 이미지로 대체 (broken icon 방지)
window.onImgError = function(img) {
    img.onerror = null;
    img.style.background = '#2d2d44';
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
};

window.showToast = function (message, type = 'success', position = 'bottom-right') {
    let containerClass = `.toast-container.${position.replace(' ', '.')}`;
    let container = document.querySelector(containerClass);
    if (!container) {
        container = document.createElement('div');
        container.className = `toast-container ${position}`;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');

    // 🚀 수정됨: '환영합니다' 또는 '로그아웃' 단어가 포함되면 모두 화려한 스타일 적용
    let toastType = type;
    if (message.includes('환영합니다') || message.includes('로그아웃')) {
        toastType += ' special-glow';
    }
    toast.className = `toast ${toastType}`;

    let icon = '✨';
    if (type === 'error') icon = '🚨';
    if (type === 'info') icon = '💡';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
};

// --- 공통 API 호출 함수 ---
async function apiFetch(endpoint, method = 'GET', body = null) {
    const url = `${BASE_URL}${endpoint}`;

    const headers = { 'Content-Type': 'application/json' };

    const token = localStorage.getItem('access_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method: method, headers: headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'API 호출 오류');
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// --- 문지기 로직 (로그인 가드 및 로그아웃) ---
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;
    const token = localStorage.getItem('access_token');

    if (!currentPage.includes('login.html') && !token) {
        showToast('로그인이 필요한 서비스입니다.', 'error', 'top-center');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return;
    }

    if (currentPage.includes('login.html') && token) {
        window.location.href = 'index.html';
        return;
    }

    const greetingObj = document.getElementById('user-greeting');
    if (greetingObj) {
        const username = localStorage.getItem('username') || '게스트';
        greetingObj.innerText = `${username}님, 환영합니다! ✨`;
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('username');

            // 🚀 수정됨: 로그아웃 알림을 상단(top-center)으로 띄움
            showToast('안전하게 로그아웃 되었습니다. 👋', 'info', 'top-center');
            setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        });
    }
});