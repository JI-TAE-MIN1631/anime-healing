from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, UserPreference, Watchlist
from app.schemas.anime import AnimeListResponse, AnimeDetailResponse
from app.core.deps import get_current_user, get_optional_current_user
from app.services.jikan import (
    search_anime_sync,
    get_anime_detail_sync,
    cache_anime,
    get_cached_anime,
)
from app.services.ai import (
    generate_comments_and_synopses_batch,
    translate_synopsis,
)

router = APIRouter(prefix="/anime", tags=["애니"])


@router.get("/recommend", response_model=AnimeListResponse)
def recommend_anime(
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

    results = search_anime_sync(
        genres=preference.genres,
        score_min=preference.score_min,
        score_max=preference.score_max,
    )

    for anime in results:
        cache_anime(db, anime)

    # AI 코멘트 + 시놉시스 번역을 1번의 API 호출로 동시 처리
    if results:
        comments, synopses_kr = generate_comments_and_synopses_batch(results)
        for i, anime in enumerate(results):
            anime["ai_comment"] = comments[i]
            anime["synopsis_kr"] = synopses_kr[i]

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
def get_anime_detail(
    mal_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """
    작품 상세 API (로그인 불필요)
    캐시 우선 조회 + 한국어 시놉시스 번역
    로그인 시 '보고싶다' 여부 포함
    """

    is_watchlisted = False
    if current_user:
        is_in_db = (
            db.query(Watchlist)
            .filter(Watchlist.user_id == current_user.id, Watchlist.mal_id == mal_id)
            .first()
        )
        if is_in_db:
            is_watchlisted = True

    cached = get_cached_anime(db, mal_id)
    if cached:
        if cached.get("synopsis"):
            cached["synopsis_kr"] = translate_synopsis(cached["synopsis"])
        else:
            cached["synopsis_kr"] = "줄거리 정보가 없습니다."

        cached["is_watchlisted"] = is_watchlisted

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

    cache_anime(db, detail)

    detail["is_watchlisted"] = is_watchlisted

    if detail.get("synopsis"):
        detail["synopsis_kr"] = translate_synopsis(detail["synopsis"])
    else:
        detail["synopsis_kr"] = "줄거리 정보가 없습니다."

    return {
        "success": True,
        "message": "작품 상세 정보",
        "data": detail,
    }