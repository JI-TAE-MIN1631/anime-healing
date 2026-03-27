"""
Jikan API v4 장르 ID 상수
프론트엔드에서 장르 선택 칩을 렌더링할 때 이 목록을 사용
"""

GENRES = [
    {"id": 1, "name": "액션"},
    {"id": 2, "name": "어드벤처"},
    {"id": 4, "name": "코미디"},
    {"id": 5, "name": "아방가르드"},
    {"id": 7, "name": "미스터리"},
    {"id": 8, "name": "드라마"},
    {"id": 10, "name": "판타지"},
    {"id": 11, "name": "게임"},
    {"id": 13, "name": "역사"},
    {"id": 14, "name": "호러"},
    {"id": 17, "name": "무술"},
    {"id": 18, "name": "메카"},
    {"id": 19, "name": "음악"},
    {"id": 22, "name": "로맨스"},
    {"id": 23, "name": "학원"},
    {"id": 24, "name": "SF"},
    {"id": 25, "name": "소년"},
    {"id": 36, "name": "일상"},
    {"id": 37, "name": "초자연"},
    {"id": 38, "name": "밀리터리"},
    {"id": 39, "name": "경찰"},
    {"id": 40, "name": "심리"},
    {"id": 41, "name": "스릴러"},
    {"id": 42, "name": "소녀"},
    {"id": 43, "name": "청년"},
    {"id": 46, "name": "수상스포츠"},
    {"id": 47, "name": "소년(성인)"},
    {"id": 48, "name": "서스펜스"},
]

# 장르 ID만 모은 집합 (유효성 검사용)
VALID_GENRE_IDS = {genre["id"] for genre in GENRES}

# Jikan 장르 ID → 한국어 이름 매핑 (Jikan API 영문 → 한국어 변환용)
GENRE_ID_TO_KR = {genre["id"]: genre["name"] for genre in GENRES}

# Jikan 영문 장르명 → 한국어 이름 매핑 (영문 이름으로도 조회 가능하도록)
GENRE_EN_TO_KR = {
    "Action": "액션", "Adventure": "어드벤처", "Comedy": "코미디",
    "Avant Garde": "아방가르드", "Mystery": "미스터리", "Drama": "드라마",
    "Fantasy": "판타지", "Game": "게임", "Historical": "역사",
    "Horror": "호러", "Martial Arts": "무술", "Mecha": "메카",
    "Music": "음악", "Romance": "로맨스", "School": "학원",
    "Sci-Fi": "SF", "Shounen": "소년", "Slice of Life": "일상",
    "Supernatural": "초자연", "Military": "밀리터리", "Police": "경찰",
    "Psychological": "심리", "Thriller": "스릴러", "Shoujo": "소녀",
    "Seinen": "청년", "Award Winning": "수상스포츠", "Gourmet": "소년(성인)",
    "Suspense": "서스펜스", "Sports": "스포츠", "Demons": "악마",
    "Magic": "마법", "Space": "우주", "Vampire": "뱀파이어",
    "Super Power": "초능력", "Harem": "하렘", "Ecchi": "에치",
    "Isekai": "이세계", "Reincarnation": "환생", "Survival": "서바이벌",
    "Time Travel": "타임트래블", "Detective": "탐정", "Medical": "의료",
    "Mythology": "신화", "Cyberpunk": "사이버펑크", "Steampunk": "스팀펑크",
}