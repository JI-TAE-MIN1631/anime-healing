document.addEventListener('DOMContentLoaded', () => {
    // --- 기존 탭/스텝 화면 전환 로직 유지 ---
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const formLogin = document.getElementById('login-form');
    const formSignup = document.getElementById('signup-form');

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active'); tabSignup.classList.remove('active');
        formLogin.classList.remove('hidden-form'); formSignup.classList.add('hidden-form');
    });

    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active'); tabLogin.classList.remove('active');
        formSignup.classList.remove('hidden-form'); formLogin.classList.add('hidden-form');
    });

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

    nextBtns.forEach((btn, index) => {
        btn.addEventListener('click', async () => {
            if (index === 0) {
                const suId = document.getElementById('signup-id').value.trim();
                const suNickname = document.getElementById('signup-nickname').value.trim();
                const suPw = document.getElementById('signup-pw').value.trim();
                const suPwConfirm = document.getElementById('signup-pw-confirm').value.trim();
                if (!suId || suId.length < 3 || suId.length > 50) {
                    showToast('아이디는 3자 이상 50자 이하로 입력해주세요.', 'error', 'top-center');
                    return;
                }
                if (!/^[a-zA-Z0-9]+$/.test(suId)) {
                    showToast('아이디는 영문자와 숫자만 사용할 수 있습니다.', 'error', 'top-center');
                    return;
                }
                if (!suNickname || suNickname.length < 1 || suNickname.length > 50) {
                    showToast('닉네임은 1자 이상 50자 이하로 입력해주세요.', 'error', 'top-center');
                    return;
                }
                if (suPw.length < 10 || !/[A-Z]/.test(suPw) || !/[a-z]/.test(suPw) || !/[0-9]/.test(suPw)) {
                    showToast('비밀번호는 10자 이상, 대/소문자, 숫자를 포함해야 합니다.', 'error', 'top-center');
                    return;
                }
                if (suPw !== suPwConfirm) {
                    showToast('비밀번호가 일치하지 않습니다.', 'error', 'top-center');
                    return;
                }
                // 아이디/닉네임 중복 체크 (동시 요청)
                try {
                    const [idRes, nickRes] = await Promise.all([
                        apiFetch(`/api/auth/check-username?username=${encodeURIComponent(suId)}`, 'GET'),
                        apiFetch(`/api/auth/check-nickname?nickname=${encodeURIComponent(suNickname)}`, 'GET')
                    ]);
                    if (!idRes.data.available) {
                        showToast('이미 사용 중인 아이디입니다.', 'error', 'top-center');
                        return;
                    }
                    if (!nickRes.data.available) {
                        showToast('이미 사용 중인 닉네임입니다.', 'error', 'top-center');
                        return;
                    }
                } catch (error) {
                    showToast(error.message || '중복 확인에 실패했습니다.', 'error', 'top-center');
                    return;
                }
            } else if (index === 1) {
                const gender = document.getElementById('signup-gender').value;
                const age = document.getElementById('signup-age').value;
                if (!gender) {
                    showToast('성별을 선택해주세요.', 'error', 'top-center');
                    return;
                }
                if (!age) {
                    showToast('연령대를 선택해주세요.', 'error', 'top-center');
                    return;
                }
            }
            if (currentStep < steps.length - 1) updateStep(currentStep + 1);
        });
    });

    const prevBtns = document.querySelectorAll('.btn-prev');
    prevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 0) updateStep(currentStep - 1);
        });
    });

    // 🚀 [API 연동 1] 백엔드에서 실제 장르 목록 가져오기
    const genreContainer = document.getElementById('genre-container');
    async function loadGenres() {
        if (!genreContainer) return;
        try {
            const response = await apiFetch('/api/genres', 'GET');
            genreContainer.innerHTML = '';
            response.data.forEach(genre => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'chip-btn';
                btn.dataset.id = genre.id;
                btn.innerText = genre.name;
                btn.addEventListener('click', () => btn.classList.toggle('selected'));
                genreContainer.appendChild(btn);
            });
        } catch (error) {
            genreContainer.innerHTML = '<p>장르 목록을 불러오지 못했습니다.</p>';
        }
    }
    loadGenres();

    // 🚀 [API 연동 2] 회원가입 완료
    formSignup.addEventListener('submit', async (e) => {
        e.preventDefault();
        const suId = document.getElementById('signup-id').value.trim();
        const suPw = document.getElementById('signup-pw').value.trim();
        const nickname = document.getElementById('signup-nickname').value.trim();
        const gender = document.getElementById('signup-gender').value;
        const ageGroup = document.getElementById('signup-age').value;
        const selectedGenres = Array.from(genreContainer.querySelectorAll('.chip-btn.selected'))
            .map(btn => parseInt(btn.dataset.id));

        try {
            await apiFetch('/api/auth/signup', 'POST', {
                username: suId,
                password: suPw,
                password_confirm: suPw,
                nickname: nickname,
                email: `${suId}@anihealing.com`,
                gender: gender,
                age_group: ageGroup,
                genres: selectedGenres
            });
            showToast('회원가입 완료! 로그인해주세요.🚀', 'success', 'top-center');
            tabLogin.click();
        } catch (error) {
            showToast(error.message || '회원가입 실패', 'error', 'top-center');
        }
    });

    // 🚀 [API 연동 3] 로그인
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('login-id').value.trim();
        const userPw = document.getElementById('login-pw').value.trim();

        try {
            const response = await apiFetch('/api/auth/login', 'POST', { username: userId, password: userPw });
            localStorage.setItem('access_token', response.data.access_token);
            localStorage.setItem('username', response.data.nickname);
            localStorage.setItem('user_id', response.data.user_id);
            showToast(`${response.data.nickname}님 환영합니다! ✨`, 'success', 'top-center');
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        } catch (error) {
            showToast(error.message || '로그인 실패', 'error', 'top-center');
        }
    });
});