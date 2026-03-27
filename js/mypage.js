document.addEventListener('DOMContentLoaded', async () => {

    // ── 프로필 정보 로드 ──────────────────────────────────────
    try {
        const res = await apiFetch('/api/users/me', 'GET');
        const { username, nickname, gender, age_group } = res.data;
        document.getElementById('display-username').innerText = username;
        document.getElementById('display-nickname').innerText = nickname;
        document.getElementById('display-gender').innerText = gender;
        document.getElementById('display-age').innerText = age_group;
    } catch (e) {
        showToast('프로필 정보를 불러오지 못했습니다.', 'error', 'top-center');
    }

    // ── 닉네임 변경 ───────────────────────────────────────────
    document.getElementById('nickname-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nickname = document.getElementById('new-nickname').value.trim();

        if (!nickname) {
            showToast('닉네임을 입력해주세요.', 'error', 'top-center');
            return;
        }
        if (nickname.length > 50) {
            showToast('닉네임은 50자 이하여야 합니다.', 'error', 'top-center');
            return;
        }

        try {
            const res = await apiFetch('/api/users/me/nickname', 'PUT', { nickname });
            // localStorage의 표시 이름도 갱신
            localStorage.setItem('username', res.data.nickname);
            document.getElementById('display-nickname').innerText = res.data.nickname;
            document.getElementById('new-nickname').value = '';
            showToast('닉네임이 변경되었습니다! ✨', 'success', 'top-center');
        } catch (error) {
            showToast(error.message || '닉네임 변경 실패', 'error', 'top-center');
        }
    });

    // ── 비밀번호 변경 ─────────────────────────────────────────
    document.getElementById('password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPw = document.getElementById('current-pw').value;
        const newPw = document.getElementById('new-pw').value;
        const newPwConfirm = document.getElementById('new-pw-confirm').value;

        // 프론트 유효성 검사
        if (!currentPw) {
            showToast('현재 비밀번호를 입력해주세요.', 'error', 'top-center');
            return;
        }
        if (newPw.length < 10 || !/[A-Z]/.test(newPw) || !/[a-z]/.test(newPw) || !/[0-9]/.test(newPw)) {
            showToast('새 비밀번호는 10자 이상, 대/소문자, 숫자를 포함해야 합니다.', 'error', 'top-center');
            return;
        }
        if (newPw !== newPwConfirm) {
            showToast('새 비밀번호가 일치하지 않습니다.', 'error', 'top-center');
            return;
        }

        try {
            await apiFetch('/api/users/me/password', 'PUT', {
                current_password: currentPw,
                new_password: newPw,
                new_password_confirm: newPwConfirm,
            });
            document.getElementById('password-form').reset();
            showToast('비밀번호가 변경되었습니다! 🔒', 'success', 'top-center');
        } catch (error) {
            showToast(error.message || '비밀번호 변경 실패', 'error', 'top-center');
        }
    });
});
