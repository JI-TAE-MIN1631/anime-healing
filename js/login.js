// js/login.js (업데이트된 전체 코드)

document.addEventListener('DOMContentLoaded', () => {
    // 1. 탭 전환 로직
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const formLogin = document.getElementById('login-form');
    const formSignup = document.getElementById('signup-form');
    
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        formLogin.classList.remove('hidden-form');
        formSignup.classList.add('hidden-form');
    });

    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        formSignup.classList.remove('hidden-form');
        formLogin.classList.add('hidden-form');
    });

    // 🚀 회원가입 가짜 완료 로직 추가 (2번째 알림을 상단에 띄우기 위해)
    const steps = document.querySelectorAll('.signup-step');
    const stepIndicators = document.querySelectorAll('.step');
    const nextBtns = document.querySelectorAll('.btn-next');
    const prevBtns = document.querySelectorAll('.btn-prev');
    let currentStep = 0;

    function updateStep(newStep) {
        steps[currentStep].classList.add('hidden-step');
        stepIndicators[currentStep].classList.remove('active-step');
        
        currentStep = newStep;
        
        steps[currentStep].classList.remove('hidden-step');
        stepIndicators[currentStep].classList.add('active-step');
    }

    nextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep < steps.length - 1) {
                updateStep(currentStep + 1);
            }
        });
    });

    // 🚀 [추가됨] 회원가입 폼 제출(가입 완료 버튼) 시
    formSignup.addEventListener('submit', (e) => {
        e.preventDefault(); // 새로고침 방지
        
        const nickname = document.getElementById('signup-nickname').value;
        
        // 브라우저 저장소에 아이디와 가짜 토큰 저장 (로그인까지 자동 시킴)
        localStorage.setItem('username', nickname);
        localStorage.setItem('access_token', 'fake-jwt-token-12345'); // 가짜 토큰 발급
        
        // 🚀 요청하신 내용: 2번째 알림(회원가입 완료)은 중앙 상단(top-center)에 띄움
        showToast(`회원가입이 완료되었습니다!\n${nickname}님, 환영합니다! 🚀`, 'success', 'top-center');
        
        // 알림창을 보여줄 시간 1초를 벌어준 뒤 메인 화면으로 이동
        setTimeout(() => {
            window.location.href = 'index.html'; 
        }, 1000);
    });

    // 2. 로그인 제출 로직 
    const userIdInput = document.getElementById('login-id');
    const userPwInput = document.getElementById('login-pw');

    formLogin.addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        const userId = userIdInput.value;
        
        localStorage.setItem('username', userId);
        localStorage.setItem('access_token', 'fake-jwt-token-12345'); 
        
        // 🚀 수정됨: 로그인 성공 알림을 상단(top-center)으로 띄움
        showToast(`${userId}님, 환영합니다! ✨`, 'success', 'top-center');
        
        setTimeout(() => {
            window.location.href = 'index.html'; 
        }, 1000);
    });
});