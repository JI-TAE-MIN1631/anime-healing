import asyncio
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, UserPreference, SearchCache, AnimeCache
from app.schemas.anime import AnimeListResponse, AnimeDetailResponse
from app.core.deps import get_current_user
from app.services.jikan import (
    search_anime_sync,
    get_anime_detail_sync,
    cache_anime,
    get_cached_anime,
)
from app.services.ai import (
    generate_comments_and_synopses_batch,
    translate_synopsis,
    translate_title,
)

SEARCH_CACHE_TTL = timedelta(hours=6)

router = APIRouter(prefix="/anime", tags=["애니"])


@router.get("/recommend", response_model=AnimeListResponse)
async def recommend_anime(
    page: int = Query(1, ge=1, description="페이지 번호"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preference = (
        db.query(UserPreference)
        .filter(UserPreference.user_id == current_user.id)
        .first()
    )

    if not preference or not preference.genres:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="취향 설정을 먼저 해주세요. (장르, 평점 구간)",
        )

    genres_sorted = sorted(preference.genres)
    cache_key = f"{','.join(map(str, genres_sorted))}_{preference.score_min}_{preference.score_max}_p{page}"

    search_cached = db.query(SearchCache).filter(SearchCache.cache_key == cache_key).first()
    use_search_cache = (
        search_cached
        and search_cached.cached_at
        and datetime.utcnow() - search_cached.cached_at < SEARCH_CACHE_TTL
    )

    if use_search_cache:
        results = []
        for mal_id in search_cached.mal_ids:
            cached = get_cached_anime(db, mal_id)
            if cached:
                results.append(cached)

        if results and all(r.get("ai_comment") for r in results):
            return {
                "success": True,
                "message": f"{len(results)}개의 추천 결과를 찾았습니다.",
                "data": results,
            }

    # [최적화 1] Jikan API를 별도 스레드로 분리해 서버 멈춤 방지
    results = await asyncio.to_thread(
        search_anime_sync,
        genres=preference.genres,
        score_min=preference.score_min,
        score_max=preference.score_max,
        page=page,
    )

    mal_ids = [a["mal_id"] for a in results]
    if search_cached:
        search_cached.mal_ids = mal_ids
        search_cached.cached_at = datetime.utcnow()
    else:
        db.add(SearchCache(cache_key=cache_key, mal_ids=mal_ids))
    db.commit()

    need_ai_indices = []
    for i, anime in enumerate(results):
        cached = get_cached_anime(db, anime["mal_id"])
        if cached and cached.get("ai_comment"):
            anime["ai_comment"] = cached["ai_comment"]
            cached_title_kr = cached.get("title_kr", "")
            if cached_title_kr and cached_title_kr != cached.get("title", ""):
                anime["title_kr"] = cached_title_kr
            else:
                need_ai_indices.append(i)
        else:
            need_ai_indices.append(i)

    if need_ai_indices:
        uncached = [results[i] for i in need_ai_indices]
        comments, synopses_kr, titles_kr = await asyncio.to_thread(
            generate_comments_and_synopses_batch, uncached
        )
        for j, i in enumerate(need_ai_indices):
            results[i]["ai_comment"] = comments[j]
            results[i]["synopsis_kr"] = synopses_kr[j]
            results[i]["title_kr"] = titles_kr[j]

    # [최적화 2] 12번 통신하던 DB를 마지막에 딱 한 번만 통신하도록 변경 (병목 해소)
    for anime in results:
        existing = db.query(AnimeCache).filter(AnimeCache.mal_id == anime["mal_id"]).first()
        if not existing:
            cache = AnimeCache(
                mal_id=anime["mal_id"],
                title=anime["title"],
                title_kr=anime.get("title_kr"),
                genres=anime["genres"],
                score=anime["score"],
                synopsis=anime.get("synopsis", ""),
                image_url=anime.get("image_url", ""),
                image_url_large=anime.get("image_url_large"),
                ai_comment=anime.get("ai_comment"),
                synopsis_kr=anime.get("synopsis_kr"),
            )
            db.add(cache)
        else:
            if anime.get("title_kr"): existing.title_kr = anime["title_kr"]
            if anime.get("image_url_large"): existing.image_url_large = anime["image_url_large"]
            if anime.get("ai_comment"): existing.ai_comment = anime["ai_comment"]
            if anime.get("synopsis_kr"): existing.synopsis_kr = anime["synopsis_kr"]
            
    db.commit() # 여기서 단 1번만 저장 실행!

    return {
        "success": True,
        "message": f"{len(results)}개의 추천 결과를 찾았습니다.",
        "data": results,
    }


@router.get("/{mal_id}", response_model=AnimeDetailResponse)
async def get_anime_detail(
    mal_id: int,
    db: Session = Depends(get_db),
):
    """
    작품 상세 API (로그인 불필요)
    캐시 우선 조회 + 한국어 시놉시스 번역
    """

    cached = get_cached_anime(db, mal_id)
    if cached:
        # synopsis_kr이 캐시에 있으면 Gemini 스킵
        if cached.get("synopsis_kr"):
            pass  # 이미 번역됨
        elif cached.get("synopsis"):
            cached["synopsis_kr"] = await asyncio.to_thread(translate_synopsis, cached["synopsis"])
            cache_anime(db, cached)
        else:
            cached["synopsis_kr"] = "줄거리 정보가 없습니다."

        return {
            "success": True,
            "message": "작품 상세 정보 (캐시)",
            "data": cached,
        }

    detail = get_anime_detail_sync(mal_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="작품을 찾을 수 없습니다.",
        )

    # 제목 + 줄거리 번역
    detail["title_kr"] = await asyncio.to_thread(translate_title, detail["title"])
    if detail.get("synopsis"):
        detail["synopsis_kr"] = await asyncio.to_thread(translate_synopsis, detail["synopsis"])
    else:
        detail["synopsis_kr"] = "줄거리 정보가 없습니다."

    cache_anime(db, detail)

    return {
        "success": True,
        "message": "작품 상세 정보",
        "data": detail,
    }