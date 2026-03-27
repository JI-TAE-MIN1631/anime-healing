from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, Watchlist, AnimeCache
from app.schemas.watchlist import (
    WatchlistToggleRequest, WatchlistToggleResponse,
    WatchlistListResponse, WatchlistDeleteResponse
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/watchlist", tags=["보고싶다"])


@router.post("", response_model=WatchlistToggleResponse)
def add_to_watchlist(
    req: WatchlistToggleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    보고싶다 추가 API (로그인 필수)
    이미 있으면 중복 추가하지 않음
    """

    # 1) 이미 보고싶다에 있는지 확인
    existing = (
        db.query(Watchlist)
        .filter(
            Watchlist.user_id == current_user.id,
            Watchlist.mal_id == req.mal_id,
        )
        .first()
    )

    if existing:
        # 이미 있으면 그냥 성공으로 처리 (프론트엔드 상태와 동기화)
        return {
            "success": True,
            "message": "이미 보고싶다에 추가된 작품입니다.",
            "data": {
                "mal_id": req.mal_id,
                "action": "already_exists",
            },
        }
    else:
        # 없으면 추가
        new_item = Watchlist(
            user_id=current_user.id,
            mal_id=req.mal_id,
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        return {
            "success": True,
            "message": "보고싶다에 추가되었습니다.",
            "data": {
                "mal_id": req.mal_id,
                "action": "added",
                "watchlist_id": new_item.id,
            },
        }


@router.get("", response_model=WatchlistListResponse)
def get_my_watchlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    내 보고싶다 목록 조회 API (로그인 필수)
    저장한 작품 목록 + 캐시에 있는 작품 정보도 함께 반환
    """

    # 1) 내 보고싶다 목록 조회
    watchlist_items = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == current_user.id)
        .order_by(Watchlist.added_at.desc())
        .all()
    )

    # 2) 각 작품의 상세 정보 가져오기 (캐시에서)
    result = []
    for item in watchlist_items:
        # 캐시에서 작품 정보 조회
        cached = (
            db.query(AnimeCache)
            .filter(AnimeCache.mal_id == item.mal_id)
            .first()
        )

        anime_data = {
            "watchlist_id": item.id,
            "mal_id": item.mal_id,
            "added_at": str(item.added_at),
        }

        if cached:
            anime_data["title"] = cached.title
            anime_data["genres"] = cached.genres
            anime_data["score"] = cached.score
            anime_data["image_url"] = cached.image_url
        else:
            anime_data["title"] = f"작품 #{item.mal_id}"
            anime_data["genres"] = []
            anime_data["score"] = None
            anime_data["image_url"] = None

        result.append(anime_data)

    return {
        "success": True,
        "message": f"보고싶다 목록 {len(result)}개를 조회했습니다.",
        "data": result,
    }


@router.delete("/{mal_id}", response_model=WatchlistDeleteResponse)
def delete_watchlist_item(
    mal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    보고싶다 개별 삭제 API (로그인 필수)
    특정 작품을 보고싶다에서 제거
    """

    # 1) 해당 항목 찾기
    item = (
        db.query(Watchlist)
        .filter(
            Watchlist.user_id == current_user.id,
            Watchlist.mal_id == mal_id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="보고싶다 목록에 해당 작품이 없습니다.",
        )

    # 2) 삭제
    db.delete(item)
    db.commit()

    return {
        "success": True,
        "message": "보고싶다에서 제거되었습니다.",
        "data": {
            "mal_id": mal_id,
        },
    }