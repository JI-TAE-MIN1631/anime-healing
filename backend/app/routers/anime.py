import asyncio
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, UserPreference, SearchCache
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
    """
    맞춤 추천 API (로그인 필수)
    저장된 취향 설정으로 자동 검색 + AI 코멘트 + 한국어 시놉시스
    Gemini API 1회 호출로 코멘트와 번역을 동시 처리
    """

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

    # 1단계: 검색 결과 캐시 확인 (Jikan API 호출 스킵 가능)
    genres_sorted = sorted(preference.genres)
    cache_key = f"{','.join(map(str, genres_sorted))}_{preference.score_min}_{preference.score_max}_p{page}"

    search_cached = db.query(SearchCache).filter(SearchCache.cache_key == cache_key).first()
    use_search_cache = (
        search_cached
        and search_cached.cached_at
        and datetime.utcnow() - search_cached.cached_at < SEARCH_CACHE_TTL
    )

    if use_search_cache:
        # 캐시된 mal_id 목록으로 DB에서 바로 조회
        results = []
        for mal_id in search_cached.mal_ids:
            cached = get_cached_anime(db, mal_id)
            if cached:
                results.append(cached)

        # 모든 항목에 AI 코멘트가 있으면 즉시 반환 (Jikan + Gemini 모두 스킵)
        if results and all(r.get("ai_comment") for r in results):
            return {
                "success": True,
                "message": f"{len(results)}개의 추천 결과를 찾았습니다.",
                "data": results,
            }

    # 2단계: Jikan API 호출 (캐시 없거나 불완전할 때만)
    results = search_anime_sync(
        genres=preference.genres,
        score_min=preference.score_min,
        score_max=preference.score_max,
        page=page,
    )

    # 검색 결과 캐싱 (mal_id 목록 저장)
    mal_ids = [a["mal_id"] for a in results]
    if search_cached:
        search_cached.mal_ids = mal_ids
        search_cached.cached_at = datetime.utcnow()
    else:
        db.add(SearchCache(cache_key=cache_key, mal_ids=mal_ids))
    db.commit()

    # 3단계: 캐시에서 ai_comment 재사용 / 없는 항목만 AI 호출
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

    # AI 처리 후 캐싱
    for anime in results:
        cache_anime(db, anime)

    return {
        "success": True,
        "message": f"{len(results)}개의 추천 결과를 찾았습니다.",
        "data": results,
    }


@router.get("/search", response_model=AnimeListResponse)
def search_anime(
    genres: str = Query(..., description="장르 ID (쉼표 구분)", examples=["1,22,36"]),
    score_min: float = Query(1.0, ge=1.0, le=10.0, description="최소 평점"),
    score_max: float = Query(10.0, ge=1.0, le=10.0, description="최대 평점"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    db: Session = Depends(get_db),
):
    """
    직접 검색 API (로그인 불필요)
    """

    try:
        genre_ids = [int(g.strip()) for g in genres.split(",")]
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="장르 ID는 숫자를 쉼표로 구분해야 합니다. (예: 1,22,36)",
        )

    if score_min >= score_max:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="최소 평점은 최대 평점보다 작아야 합니다.",
        )

    results = search_anime_sync(
        genres=genre_ids,
        score_min=score_min,
        score_max=score_max,
        page=page,
    )

    for anime in results:
        cache_anime(db, anime)

    return {
        "success": True,
        "message": f"{len(results)}개의 검색 결과를 찾았습니다.",
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