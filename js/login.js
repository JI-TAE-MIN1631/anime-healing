// js/login.js

document.addEventListener('DOMContentLoaded', () => {
    // 탭 전환 로직
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

    // 회원가입 단계 전환 로직
    const steps = document.querySelectorAll('.signup-step');
    const stepIndicators = document.querySelectorAll('.step');
    const nextBtns = document.querySelectorAll('.btn-next');
    let currentStep = 0;

    function updateStep(newStep) {
        steps[currentStep].classList.add('hidden-step');
        stepIndicators[currentStep].classList.remove('active-step');
        currentStep = newStep;
        steps[currentStep].classList.remove('hidden-step');
        stepIndicators[currentStep].classList.add('active-step');
    }

    // 🚀 [추가됨] 회원가입 다음 버튼 누를 때 유효성 검사
    nextBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            if (index === 0) {
                // STEP 1: 아이디/비밀번호 검사
                const suId = document.getElementById('signup-id').value.trim();
                const suPw = document.getElementById('signup-pw').value.trim();
                if (!suId || suPw.length < 4) {
                    showToast('아이디를 입력하고, 비밀번호는 4자 이상이어야 합니다.', 'error', 'top-center');
                    return; // 통과 못하면 다음 단계로 안 넘어감!
                }
            } else if (index === 1) {
                // STEP 2: 닉네임 검사
                const nickname = document.getElementById('signup-nickname').value.trim();
                if (!nickname) {
                    showToast('사용하실 닉네임을 입력해 주세요.', 'error', 'top-center');
                    return; 
                }
            }
            if (currentStep < steps.length - 1) updateStep(currentStep + 1);
        });
    });

    // 회원가입 완료(Submit) 로직
    formSignup.addEventListener('submit', (e) => {
        e.preventDefault(); 
        const nickname = document.getElementById('signup-nickname').value.trim();
        
        localStorage.setItem('username', nickname);
        localStorage.setItem('access_token', 'fake-jwt-token-12345'); 
        
        showToast(`회원가입이 완료되었습니다!\n${nickname}님, 환영합니다! 🚀`, 'success', 'top-center');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    });

    // 🚀 [추가됨] 로그인 폼 제출 시 유효성 검사 추가
    const userIdInput = document.getElementById('login-id');
    const userPwInput = document.getElementById('login-pw');

    formLogin.addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        const userId = userIdInput.value.trim(); // 양쪽 공백 제거
        const userPw = userPwInput.value.trim();
        
        // 빈칸이 하나라도 있으면 방어!
        if (!userId || !userPw) {
            showToast('아이디와 비밀번호를 모두 입력해 주세요.', 'error', 'top-center');
            return; 
        }

        localStorage.setItem('username', userId);
        localStorage.setItem('access_token', 'fake-jwt-token-12345'); 
        
        showToast(`${userId}님, 환영합니다! ✨`, 'success', 'top-center');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    });
});