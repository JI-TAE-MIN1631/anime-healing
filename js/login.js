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

    // HTML select value → 백엔드 스키마 값 매핑
    const GENDER_MAP = { 'male': '남성', 'female': '여성', 'none': '선택안함' };
    const AGE_MAP = { '10': '10대', '20': '20대', '30': '30대', '40': '40대', '50+': '50대+' };

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

    // 회원가입 다음 버튼 누를 때 유효성 검사
    nextBtns.forEach((btn, index) => {
        btn.addEventListener('click', async () => {
            if (index === 0) {
                // STEP 1: 유효성 검사 (프론트 + 백엔드 중복 확인)
                const suId = document.getElementById('signup-id').value.trim();
                const suNickname = document.getElementById('signup-nickname').value.trim();
                const suPw = document.getElementById('signup-pw').value.trim();
                const suPwConfirm = document.getElementById('signup-pw-confirm').value.trim();

                if (!suId || suId.length < 3 || suId.length > 50) {
                    showToast('아이디는 3자 이상 50자 이하로 입력해 주세요.', 'error', 'top-center');
                    return;
                }
                if (!/^[a-zA-Z0-9]+$/.test(suId)) {
                    showToast('아이디는 영문자와 숫자만 사용할 수 있습니다.', 'error', 'top-center');
                    return;
                }
                if (!suNickname || suNickname.length < 1 || suNickname.length > 50) {
                    showToast('닉네임은 1자 이상 50자 이하로 입력해 주세요.', 'error', 'top-center');
                    return;
                }
                if (suPw.length < 10) {
                    showToast('비밀번호는 10자 이상이어야 합니다. (대소문자+숫자 포함)', 'error', 'top-center');
                    return;
                }
                if (suPw !== suPwConfirm) {
                    showToast('비밀번호가 일치하지 않습니다.', 'error', 'top-center');
                    return;
                }

                // 백엔드에 아이디/닉네임 중복 확인 요청
                try {
                    // 두 요청을 동시에 보내서 시간 절약
                    await Promise.all([
                        apiFetch(`/api/auth/check-username/${suId}`, 'GET'),
                        apiFetch(`/api/auth/check-nickname/${suNickname}`, 'GET')
                    ]);
                } catch (error) {
                    showToast(error.message || '중복 확인에 실패했습니다.', 'error', 'top-center');
                    return; // 중복이거나 에러 발생 시 중단
                }
            } else if (index === 1) {
                // STEP 2: 성별/연령대 검사
                const gender = document.getElementById('signup-gender').value;
                const age = document.getElementById('signup-age').value;
                if (!gender) {
                    showToast('성별을 선택해 주세요.', 'error', 'top-center');
                    return;
                }
                if (!age) {
                    showToast('연령대를 선택해 주세요.', 'error', 'top-center');
                    return;
                }
            }
            if (currentStep < steps.length - 1) updateStep(currentStep + 1);
        });
    });

    // 회원가입 이전 버튼 클릭 시 이전 단계로
    const prevBtns = document.querySelectorAll('.btn-prev');
    prevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 0) updateStep(currentStep - 1);
        });
    });

    // 회원가입 완료(Submit) — 실제 백엔드 API 호출
    formSignup.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('signup-id').value.trim();
        const nickname = document.getElementById('signup-nickname').value.trim();
        const password = document.getElementById('signup-pw').value.trim();
        const passwordConfirm = document.getElementById('signup-pw-confirm').value.trim();
        const genderRaw = document.getElementById('signup-gender').value;
        const ageRaw = document.getElementById('signup-age').value;

        // HTML select value를 백엔드 스키마 값으로 변환
        const gender = GENDER_MAP[genderRaw] || '선택안함';
        const ageGroup = AGE_MAP[ageRaw] || '20대';

        // 이메일 필드가 HTML에 없으므로 아이디 기반으로 자동 생성
        const email = `${username}@anihealing.com`;

        try {
            await apiFetch('/api/auth/signup', 'POST', {
                username: username,
                email: email,
                nickname: nickname,
                password: password,
                password_confirm: passwordConfirm,
                gender: gender,
                age_group: ageGroup,
            });

            showToast(`회원가입이 완료되었습니다!\n${nickname}님, 환영합니다! 🚀`, 'success', 'top-center');

            // 가입 성공 후 자동으로 로그인 처리
            const loginData = await apiFetch('/api/auth/login', 'POST', {
                username: username,
                password: password,
            });

            // 서버에서 받은 진짜 JWT 토큰과 유저 정보 저장
            localStorage.setItem('access_token', loginData.data.access_token);
            localStorage.setItem('username', loginData.data.nickname);
            localStorage.setItem('user_id', loginData.data.user_id);

            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        } catch (error) {
            showToast(error.message || '회원가입에 실패했습니다.', 'error', 'top-center');
        }
    });

    // 로그인 폼 제출 — 실제 백엔드 API 호출
    const userIdInput = document.getElementById('login-id');
    const userPwInput = document.getElementById('login-pw');

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userId = userIdInput.value.trim();
        const userPw = userPwInput.value.trim();

        // 빈칸 방어
        if (!userId || !userPw) {
            showToast('아이디와 비밀번호를 모두 입력해 주세요.', 'error', 'top-center');
            return;
        }

        try {
            const data = await apiFetch('/api/auth/login', 'POST', {
                username: userId,
                password: userPw,
            });

            // 서버에서 받은 진짜 JWT 토큰과 유저 정보 저장
            localStorage.setItem('access_token', data.data.access_token);
            localStorage.setItem('username', data.data.nickname);
            localStorage.setItem('user_id', data.data.user_id);

            showToast(`${data.data.nickname}님, 환영합니다! ✨`, 'success', 'top-center');
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        } catch (error) {
            showToast(error.message || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해 주세요.', 'error', 'top-center');
        }
    });
});