// js/preferences.js

document.addEventListener('DOMContentLoaded', () => {
    // 요소 선택
    const scoreMin = document.getElementById('score-min');
    const scoreMax = document.getElementById('score-max');
    const minValDisplay = document.getElementById('min-val-display');
    const maxValDisplay = document.getElementById('max-val-display');
    const chipBtns = document.querySelectorAll('.chip-btn');
    const presetBtns = document.querySelectorAll('.preset-btn');
    
    const summaryGenres = document.getElementById('summary-genres');
    const summaryScore = document.getElementById('summary-score');
    const saveBtn = document.getElementById('save-pref-btn');

    // 장르 ID(숫자)를 저장하는 Set (백엔드가 ID 배열을 기대하므로)
    let selectedGenreIds = new Set();

    // --- 1. 평점 슬라이더 로직 ---
    function updateSliders() {
        let min = parseFloat(scoreMin.value);
        let max = parseFloat(scoreMax.value);

        // 최소값이 최대값보다 커지지 않도록 방어
        if (min > max) {
            let tmp = min;
            min = max;
            max = tmp;
            scoreMin.value = min;
            scoreMax.value = max;
        }

        minValDisplay.innerText = min.toFixed(1);
        maxValDisplay.innerText = max.toFixed(1);
        updateSummary();
    }

    scoreMin.addEventListener('input', updateSliders);
    scoreMax.addEventListener('input', updateSliders);

    // --- 2. 장르 칩 선택 로직 (ID 기반) ---
    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const genreId = parseInt(btn.dataset.id);
            
            // 토글 (선택/해제)
            if (selectedGenreIds.has(genreId)) {
                selectedGenreIds.delete(genreId);
                btn.classList.remove('selected');
            } else {
                selectedGenreIds.add(genreId);
                btn.classList.add('selected');
            }
            updateSummary();
        });
    });

    // --- 3. 하단 요약 바 업데이트 ---
    function updateSummary() {
        // 장르 요약 (선택된 칩의 텍스트를 모아서 표시)
        if (selectedGenreIds.size === 0) {
            summaryGenres.innerText = "선택된 장르 없음";
        } else {
            const selectedNames = [];
            chipBtns.forEach(btn => {
                if (selectedGenreIds.has(parseInt(btn.dataset.id))) {
                    selectedNames.push(btn.innerText);
                }
            });
            // 2개까지만 보여주고 나머지는 '+ N' 으로 표시
            if (selectedNames.length > 2) {
                summaryGenres.innerText = `${selectedNames[0]}, ${selectedNames[1]} 외 ${selectedNames.length - 2}개`;
            } else {
                summaryGenres.innerText = selectedNames.join(', ');
            }
        }

        // 평점 요약
        summaryScore.innerText = `${scoreMin.value} ~ ${scoreMax.value}점`;
    }

    // --- 4. 빠른 선택 (프리셋) 로직 ---
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            
            // 초기화
            selectedGenreIds.clear();
            chipBtns.forEach(c => c.classList.remove('selected'));

            if (preset === 'healing') {
                selectChipById(36); // 일상
                scoreMin.value = 5.0; scoreMax.value = 10.0;
            } else if (preset === 'action') {
                selectChipById(1);  // 액션
                selectChipById(10); // 판타지
                scoreMin.value = 6.0; scoreMax.value = 10.0;
            } else if (preset === 'romance') {
                selectChipById(22); // 로맨스
                selectChipById(4);  // 코미디
                scoreMin.value = 5.0; scoreMax.value = 10.0;
            } else if (preset === 'masterpiece') {
                scoreMin.value = 8.5; scoreMax.value = 10.0;
            }
            
            updateSliders();
        });
    });

    // 장르 ID로 칩을 선택하는 헬퍼 함수
    function selectChipById(genreId) {
        chipBtns.forEach(btn => {
            if (parseInt(btn.dataset.id) === genreId) {
                selectedGenreIds.add(genreId);
                btn.classList.add('selected');
            }
        });
    }

    // --- 5. 저장 버튼 클릭 시 백엔드 API 호출 ---
    saveBtn.addEventListener('click', async () => {
        if (selectedGenreIds.size === 0) {
            showToast("최소 1개 이상의 장르를 선택해주세요!", 'error');
            return;
        }

        try {
            await apiFetch('/api/users/me/preferences', 'PUT', {
                genres: Array.from(selectedGenreIds),
                score_min: parseFloat(scoreMin.value),
                score_max: parseFloat(scoreMax.value),
            });

            showToast('취향 설정이 저장되었습니다! 🎉', 'success');
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        } catch (error) {
            showToast(error.message || '취향 설정 저장에 실패했습니다.', 'error');
        }
    });
});