from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from app.schemas.profile import UpdateNicknameRequest, UpdatePasswordRequest, UserProfileResponse
from app.core.deps import get_current_user
from app.core.security import verify_password, hash_password

router = APIRouter(tags=["프로필"])


@router.get("/users/me", response_model=UserProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    """내 프로필 조회 (로그인 필수)"""
    return {
        "success": True,
        "message": "프로필 조회 성공",
        "data": {
            "user_id": current_user.id,
            "username": current_user.username,
            "nickname": current_user.nickname,
            "gender": current_user.gender,
            "age_group": current_user.age_group,
        },
    }


@router.put("/users/me/nickname", response_model=UserProfileResponse)
def update_nickname(
    req: UpdateNicknameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """닉네임 변경 (로그인 필수)"""
    # 중복 닉네임 체크 (본인 제외)
    existing = (
        db.query(User)
        .filter(User.nickname == req.nickname, User.id != current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 닉네임입니다.",
        )

    current_user.nickname = req.nickname
    db.commit()

    return {
        "success": True,
        "message": "닉네임이 변경되었습니다.",
        "data": {"nickname": req.nickname},
    }


@router.put("/users/me/password", response_model=UserProfileResponse)
def update_password(
    req: UpdatePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """비밀번호 변경 (로그인 필수)"""
    # 현재 비밀번호 확인
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 비밀번호가 올바르지 않습니다.",
        )

    current_user.password_hash = hash_password(req.new_password)
    db.commit()

    return {
        "success": True,
        "message": "비밀번호가 변경되었습니다.",
        "data": None,
    }
