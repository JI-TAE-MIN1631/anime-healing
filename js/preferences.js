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

    let selectedGenres = new Set(); // 중복 없는 장르 저장소

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

    // --- 2. 장르 칩 선택 로직 ---
    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const genreName = btn.innerText;
            
            // 토글 (선택/해제)
            if (selectedGenres.has(genreName)) {
                selectedGenres.delete(genreName);
                btn.classList.remove('selected');
            } else {
                selectedGenres.add(genreName);
                btn.classList.add('selected');
            }
            updateSummary();
        });
    });

    // --- 3. 하단 요약 바 업데이트 ---
    function updateSummary() {
        // 장르 요약
        if (selectedGenres.size === 0) {
            summaryGenres.innerText = "선택된 장르 없음";
        } else {
            const genreArr = Array.from(selectedGenres);
            // 2개까지만 보여주고 나머지는 '+ N' 으로 표시
            if (genreArr.length > 2) {
                summaryGenres.innerText = `${genreArr[0]}, ${genreArr[1]} 외 ${genreArr.length - 2}개`;
            } else {
                summaryGenres.innerText = genreArr.join(', ');
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
            selectedGenres.clear();
            chipBtns.forEach(c => c.classList.remove('selected'));

            if (preset === 'healing') {
                selectChip('일상');
                scoreMin.value = 5.0; scoreMax.value = 10.0;
            } else if (preset === 'action') {
                selectChip('액션'); selectChip('판타지');
                scoreMin.value = 6.0; scoreMax.value = 10.0;
            } else if (preset === 'romance') {
                selectChip('로맨스'); selectChip('코미디');
                scoreMin.value = 5.0; scoreMax.value = 10.0;
            } else if (preset === 'masterpiece') {
                scoreMin.value = 8.5; scoreMax.value = 10.0;
            }
            
            updateSliders();
        });
    });

    function selectChip(name) {
        chipBtns.forEach(btn => {
            if (btn.innerText === name) {
                selectedGenres.add(name);
                btn.classList.add('selected');
            }
        });
    }

    // --- 5. 저장 버튼 클릭 시 다음 페이지로 이동 ---
    saveBtn.addEventListener('click', () => {
        if (selectedGenres.size === 0) {
            alert("최소 1개 이상의 장르를 선택해주세요!");
            return;
        }
        // 원래는 여기서 API 통신을 해야 하지만, 프론트 먼저 하므로 바로 화면 이동
        window.location.href = 'index.html'; 
    });
});