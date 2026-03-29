document.addEventListener('DOMContentLoaded', () => {
    const scoreMin = document.getElementById('score-min');
    const scoreMax = document.getElementById('score-max');
    const minValDisplay = document.getElementById('min-val-display');
    const maxValDisplay = document.getElementById('max-val-display');
    const saveBtn = document.getElementById('save-pref-btn');
    const genreContainer = document.getElementById('genre-container');
    const summaryGenres = document.getElementById('summary-genres');
    const summaryScore = document.getElementById('summary-score');

    let selectedGenres = new Set();

    // ── 슬라이더 ──────────────────────────────────────────────
    function updateSliders() {
        let min = parseFloat(scoreMin.value);
        let max = parseFloat(scoreMax.value);
        if (min > max) { [min, max] = [max, min]; scoreMin.value = min; scoreMax.value = max; }
        minValDisplay.innerText = min.toFixed(1);
        maxValDisplay.innerText = max.toFixed(1);
        if (summaryScore) summaryScore.innerText = `${min.toFixed(1)} ~ ${max.toFixed(1)}점`;
    }
    scoreMin.addEventListener('input', updateSliders);
    scoreMax.addEventListener('input', updateSliders);

    // ── 장르 요약 업데이트 ────────────────────────────────────
    function updateSummaryGenres() {
        if (!summaryGenres) return;
        const selected = genreContainer.querySelectorAll('.chip-btn.selected');
        summaryGenres.innerText = selected.length === 0
            ? '선택된 장르 없음'
            : Array.from(selected).map(c => c.innerText).join(', ');
    }

    // ── 칩 버튼 이벤트 연결 ───────────────────────────────────
    function addChipListener(btn) {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            if (selectedGenres.has(id)) {
                selectedGenres.delete(id);
                btn.classList.remove('selected');
            } else {
                selectedGenres.add(id);
                btn.classList.add('selected');
            }
            updateSummaryGenres();
        });
    }

    // ── 장르 목록 API 로드 ────────────────────────────────────
    async function loadGenres() {
        try {
            const res = await apiFetch('/api/genres', 'GET');
            genreContainer.innerHTML = '';
            res.data.forEach(genre => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'chip-btn';
                btn.dataset.id = genre.id;
                btn.innerText = genre.name;
                addChipListener(btn);
                genreContainer.appendChild(btn);
            });
        } catch (e) {
            genreContainer.innerHTML = '<p style="color:#e55;">장르 목록을 불러오지 못했습니다.</p>';
        }
    }

    // ── 현재 취향 설정 불러와서 UI에 반영 ────────────────────
    async function loadCurrentPreferences() {
        try {
            const res = await apiFetch('/api/users/me/preferences', 'GET');
            if (!res.data) return;
            const { genres, score_min, score_max } = res.data;

            scoreMin.value = score_min;
            scoreMax.value = score_max;
            updateSliders();

            if (genres && genres.length > 0) {
                genres.forEach(id => {
                    selectedGenres.add(id);
                    const chip = genreContainer.querySelector(`[data-id="${id}"]`);
                    if (chip) chip.classList.add('selected');
                });
                updateSummaryGenres();
            }
        } catch (e) { /* 설정 없으면 무시 */ }
    }

    // 장르 로드 완료 후 현재 설정 적용 (순서 중요)
    async function init() {
        await loadGenres();
        await loadCurrentPreferences();
    }
    init();

    // ── 빠른 취향 선택 프리셋 ────────────────────────────────
    const PRESETS = {
        healing: { genres: [36, 4, 8, 22], score_min: 5.0, score_max: 10.0 },
        action: { genres: [1, 2, 17], score_min: 6.0, score_max: 10.0 },
        romance: { genres: [22, 23, 8], score_min: 6.0, score_max: 10.0 },
        masterpiece: { genres: 'all', score_min: 8.5, score_max: 10.0 },
    };

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = PRESETS[btn.dataset.preset];
            if (!preset) return;

            // 기존 선택 초기화
            selectedGenres.clear();
            genreContainer.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('selected'));

            // 장르 선택
            const ids = preset.genres === 'all'
                ? Array.from(genreContainer.querySelectorAll('.chip-btn')).map(c => parseInt(c.dataset.id))
                : preset.genres;

            ids.forEach(id => {
                selectedGenres.add(id);
                const chip = genreContainer.querySelector(`[data-id="${id}"]`);
                if (chip) chip.classList.add('selected');
            });

            // 슬라이더 설정
            scoreMin.value = preset.score_min;
            scoreMax.value = preset.score_max;
            updateSliders();
            updateSummaryGenres();
        });
    });

    // ── 저장 ─────────────────────────────────────────────────
    saveBtn.addEventListener('click', async () => {
        if (selectedGenres.size === 0) {
            showToast('장르를 1개 이상 선택해주세요!', 'error');
            return;
        }
        const min = parseFloat(scoreMin.value);
        const max = parseFloat(scoreMax.value);
        if (min >= max) {
            showToast('최소 평점은 최대 평점보다 작아야 합니다.', 'error');
            return;
        }
        try {
            await apiFetch('/api/users/me/preferences', 'PUT', {
                genres: Array.from(selectedGenres),
                score_min: min,
                score_max: max,
            });
            showToast('취향 설정이 저장되었습니다. 🎉', 'success');
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        } catch (error) {
            showToast(error.message || '저장 실패', 'error');
        }
    });
});
