from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, UserPreference
from app.schemas.preferences import (
    PreferenceRequest, PreferenceResponse, GenreListResponse
)
from app.core.deps import get_current_user
from app.core.genres import GENRES, VALID_GENRE_IDS

router = APIRouter(tags=["취향 설정"])


@router.get("/genres", response_model=GenreListResponse)
def get_genres():
    """
    장르 목록 조회 API (로그인 불필요)
    프론트에서 장르 선택 칩을 렌더링할 때 사용
    """
    return {
        "success": True,
        "message": "장르 목록 조회 성공",
        "data": GENRES,
    }


@router.get("/users/me/preferences", response_model=PreferenceResponse)
def get_my_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    내 취향 설정 조회 API (로그인 필수)
    현재 로그인한 유저의 장르, 평점 구간을 반환
    """
    preference = (
        db.query(UserPreference)
        .filter(UserPreference.user_id == current_user.id)
        .first()
    )

    if not preference:
        return {
            "success": True,
            "message": "아직 취향 설정이 없습니다.",
            "data": None,
        }

    return {
        "success": True,
        "message": "취향 설정 조회 성공",
        "data": {
            "genres": preference.genres,
            "score_min": preference.score_min,
            "score_max": preference.score_max,
            "updated_at": str(preference.updated_at),
        },
    }


@router.put("/users/me/preferences", response_model=PreferenceResponse)
def update_my_preferences(
    req: PreferenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    취향 설정 저장/수정 API (로그인 필수)
    장르 배열 + 평점 구간을 저장
    이미 설정이 있으면 수정, 없으면 새로 생성
    """

    # 1) 장르 ID 유효성 검사
    invalid_ids = [g for g in req.genres if g not in VALID_GENRE_IDS]
    if invalid_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 장르 ID가 포함되어 있습니다: {invalid_ids}",
        )

    # 2) 기존 설정 조회
    preference = (
        db.query(UserPreference)
        .filter(UserPreference.user_id == current_user.id)
        .first()
    )

    if preference:
        # 기존 설정이 있으면 수정
        preference.genres = req.genres
        preference.score_min = req.score_min
        preference.score_max = req.score_max
    else:
        # 없으면 새로 생성
        preference = UserPreference(
            user_id=current_user.id,
            genres=req.genres,
            score_min=req.score_min,
            score_max=req.score_max,
        )
        db.add(preference)

    db.commit()
    db.refresh(preference)

    return {
        "success": True,
        "message": "취향 설정이 저장되었습니다.",
        "data": {
            "genres": preference.genres,
            "score_min": preference.score_min,
            "score_max": preference.score_max,
            "updated_at": str(preference.updated_at),
        },
    }