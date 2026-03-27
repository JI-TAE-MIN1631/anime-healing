from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.models import User
from app.core.deps import get_current_user
from app.core.security import verify_password, hash_password

router = APIRouter(prefix="/users", tags=["유저"])


# --- 스키마 정의 ---

class NicknameUpdateRequest(BaseModel):
    """닉네임 변경 요청"""
    nickname: str = Field(..., min_length=1, max_length=50)


class PasswordChangeRequest(BaseModel):
    """비밀번호 변경 요청"""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=10)
    new_password_confirm: str = Field(..., min_length=10)


# --- API 엔드포인트 ---

@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    """
    내 프로필 정보 조회 API
    JWT 토큰에서 유저 식별
    """
    return {
        "success": True,
        "message": "프로필 조회 성공",
        "data": {
            "user_id": current_user.id,
            "username": current_user.username,
            "nickname": current_user.nickname,
            "gender": current_user.gender or "-",
            "age_group": current_user.age_group or "-",
        },
    }


@router.put("/me/nickname")
def update_nickname(
    req: NicknameUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    닉네임 변경 API
    중복 닉네임 체크 후 변경
    """

    # 닉네임 중복 체크 (자기 자신은 제외)
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
    db.refresh(current_user)

    return {
        "success": True,
        "message": "닉네임이 변경되었습니다.",
        "data": {"nickname": current_user.nickname},
    }


@router.put("/me/password")
def change_password(
    req: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    비밀번호 변경 API
    현재 비밀번호 확인 후 새 비밀번호로 변경
    """

    # 1) 현재 비밀번호 확인
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 비밀번호가 올바르지 않습니다.",
        )

    # 2) 새 비밀번호 일치 확인
    if req.new_password != req.new_password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="새 비밀번호가 일치하지 않습니다.",
        )

    # 3) 비밀번호 복잡성 검증 (대문자, 소문자, 숫자 포함)
    import re
    if not re.search(r"[A-Z]", req.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="새 비밀번호에 대문자가 포함되어야 합니다.",
        )
    if not re.search(r"[a-z]", req.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="새 비밀번호에 소문자가 포함되어야 합니다.",
        )
    if not re.search(r"[0-9]", req.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="새 비밀번호에 숫자가 포함되어야 합니다.",
        )

    # 4) 비밀번호 변경
    current_user.password_hash = hash_password(req.new_password)
    db.commit()

    return {
        "success": True,
        "message": "비밀번호가 변경되었습니다.",
        "data": None,
    }
