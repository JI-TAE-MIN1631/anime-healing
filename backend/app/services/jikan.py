import httpx
import asyncio
from sqlalchemy.orm import Session
from app.models.models import AnimeCache
from app.core.genres import GENRE_ID_TO_KR, GENRE_EN_TO_KR
from datetime import datetime

# Jikan API 기본 URL
JIKAN_BASE_URL = "https://api.jikan.moe/v4"

# Jikan은 분당 60회 제한이 있어서 요청 사이에 딜레이를 줌
REQUEST_DELAY = 0.5  # 0.5초


async def fetch_from_jikan(url: str, params: dict = None) -> dict | None:
    """
    Jikan API에 GET 요청을 보내는 함수
    실패하면 None 반환
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Jikan API 에러: {response.status_code}")
                return None
    except Exception as e:
        print(f"Jikan API 요청 실패: {e}")
        return None


def search_anime_sync(genres: list[int], score_min: float, score_max: float, page: int = 1) -> list[dict]:
    """
    장르 + 평점 구간으로 애니메이션 검색 (동기 함수)
    FastAPI 엔드포인트에서 직접 호출
    """
    params = {
        "genres": ",".join(str(g) for g in genres),
        "min_score": score_min,
        "max_score": score_max,
        "order_by": "score",
        "sort": "desc",
        "page": page,
        "limit": 12,
        "sfw": "true",
    }

    url = f"{JIKAN_BASE_URL}/anime"

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                anime_list = data.get("data", [])
                return _parse_anime_list(anime_list)
            else:
                print(f"Jikan 검색 에러: {response.status_code}")
                return []
    except Exception as e:
        print(f"Jikan 검색 실패: {e}")
        return []


def get_anime_detail_sync(mal_id: int) -> dict | None:
    """
    특정 작품의 상세 정보를 가져오는 함수 (동기)
    """
    url = f"{JIKAN_BASE_URL}/anime/{mal_id}/full"

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(url)
            if response.status_code == 200:
                data = response.json()
                anime = data.get("data")
                if anime:
                    return _parse_anime_detail(anime)
            return None
    except Exception as e:
        print(f"Jikan 상세 조회 실패: {e}")
        return None


def cache_anime(db: Session, anime_data: dict):
    """
    애니메이션 데이터를 DB에 캐싱
    이미 캐시에 있으면 title_kr, image_url_large만 보완
    """
    existing = db.query(AnimeCache).filter(AnimeCache.mal_id == anime_data["mal_id"]).first()
    if not existing:
        cache = AnimeCache(
            mal_id=anime_data["mal_id"],
            title=anime_data["title"],
            title_kr=anime_data.get("title_kr"),
            genres=anime_data["genres"],
            score=anime_data["score"],
            synopsis=anime_data.get("synopsis", ""),
            image_url=anime_data.get("image_url", ""),
            image_url_large=anime_data.get("image_url_large"),
            ai_comment=anime_data.get("ai_comment"),
        )
        db.add(cache)
    else:
        # 기존 캐시에 없는 필드만 보완
        if anime_data.get("title_kr") and not existing.title_kr:
            existing.title_kr = anime_data["title_kr"]
        if anime_data.get("image_url_large") and not existing.image_url_large:
            existing.image_url_large = anime_data["image_url_large"]
        if anime_data.get("ai_comment") and not existing.ai_comment:
            existing.ai_comment = anime_data["ai_comment"]
    db.commit()


def get_cached_anime(db: Session, mal_id: int) -> dict | None:
    """
    캐시에서 애니메이션 데이터 조회
    캐시에 있으면 DB 데이터 반환, 없으면 None
    """
    cached = db.query(AnimeCache).filter(AnimeCache.mal_id == mal_id).first()
    if cached:
        return {
            "mal_id": cached.mal_id,
            "title": cached.title,
            "title_kr": cached.title_kr,
            "genres": cached.genres,
            "score": cached.score,
            "synopsis": cached.synopsis,
            "image_url": cached.image_url,
            "image_url_large": cached.image_url_large,
            "ai_comment": cached.ai_comment,
        }
    return None


def _translate_genres(raw_genres: list) -> list[str]:
    """Jikan 장르 목록을 한국어 이름으로 변환"""
    result = []
    for g in raw_genres:
        gid = g.get("mal_id")
        gname = g.get("name", "")
        kr = GENRE_ID_TO_KR.get(gid) or GENRE_EN_TO_KR.get(gname) or gname
        result.append(kr)
    return result


def _parse_anime_list(anime_list: list) -> list[dict]:
    """
    Jikan API 응답에서 필요한 필드만 추출 (목록용)
    """
    results = []
    for anime in anime_list:
        raw_genres = anime.get("genres", [])
        results.append({
            "mal_id": anime.get("mal_id"),
            "title": anime.get("title", ""),
            "genres": _translate_genres(raw_genres),
            "genre_ids": [g["mal_id"] for g in raw_genres],
            "score": anime.get("score", 0),
            "synopsis": anime.get("synopsis", ""),
            "image_url": anime.get("images", {}).get("jpg", {}).get("image_url", ""),
            "image_url_large": anime.get("images", {}).get("jpg", {}).get("large_image_url", ""),
            "episodes": anime.get("episodes"),
            "status": anime.get("status", ""),
            "year": anime.get("year"),
        })
    return results


def _parse_anime_detail(anime: dict) -> dict:
    """
    Jikan API 응답에서 필요한 필드만 추출 (상세용)
    """
    raw_genres = anime.get("genres", [])
    return {
        "mal_id": anime.get("mal_id"),
        "title": anime.get("title", ""),
        "title_japanese": anime.get("title_japanese", ""),
        "genres": _translate_genres(raw_genres),
        "genre_ids": [g["mal_id"] for g in raw_genres],
        "score": anime.get("score", 0),
        "scored_by": anime.get("scored_by", 0),
        "rank": anime.get("rank"),
        "popularity": anime.get("popularity"),
        "synopsis": anime.get("synopsis", ""),
        "image_url": anime.get("images", {}).get("jpg", {}).get("large_image_url", ""),
        "episodes": anime.get("episodes"),
        "status": anime.get("status", ""),
        "aired": anime.get("aired", {}).get("string", ""),
        "duration": anime.get("duration", ""),
        "rating": anime.get("rating", ""),
        "year": anime.get("year"),
        "studios": [s["name"] for s in anime.get("studios", [])],
        "themes": [t["name"] for t in anime.get("themes", [])],
    }