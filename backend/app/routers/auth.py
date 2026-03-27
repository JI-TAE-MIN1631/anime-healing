from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import User, UserPreference
from app.schemas.auth import (
    SignupRequest, LoginRequest, TokenResponse, MessageResponse
)
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["인증"])


@router.get("/check-username/{username}", response_model=MessageResponse)
def check_username_availability(username: str, db: Session = Depends(get_db)):
    """
    아이디 사용 가능 여부 실시간 확인
    """
    if db.query(User).filter(func.lower(User.username) == func.lower(username)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용 중인 아이디입니다.",
        )
    return {"success": True, "message": "사용 가능한 아이디입니다."}


@router.get("/check-nickname/{nickname}", response_model=MessageResponse)
def check_nickname_availability(nickname: str, db: Session = Depends(get_db)):
    """
    닉네임 사용 가능 여부 실시간 확인
    """
    if db.query(User).filter(func.lower(User.nickname) == func.lower(nickname)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용 중인 닉네임입니다.",
        )
    return {"success": True, "message": "사용 가능한 닉네임입니다."}


@router.post("/signup", response_model=MessageResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    """
    회원가입 API
    - 아이디 중복 체크 (대소문자 구분 X)
    - 이메일 중복 체크 (대소문자 구분 X)
    - 닉네임 중복 체크 (대소문자 구분 X)
    - 비밀번호 암호화 후 저장
    - 선호 장르가 있으면 취향 설정도 함께 저장
    """

    # 1) 아이디 중복 체크 (대소문자 구분 없이)
    if db.query(User).filter(func.lower(User.username) == func.lower(req.username)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 아이디입니다.",
        )

    # 2) 이메일 중복 체크 (대소문자 구분 없이)
    if db.query(User).filter(func.lower(User.email) == func.lower(req.email)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 이메일입니다.",
        )

    # 3) 닉네임 중복 체크 (대소문자 구분 없이)
    if db.query(User).filter(func.lower(User.nickname) == func.lower(req.nickname)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 닉네임입니다.",
        )

    # 4) 유저 생성
    new_user = User(
        username=req.username,
        email=req.email,
        nickname=req.nickname,
        password_hash=hash_password(req.password),
        gender=req.gender,
        age_group=req.age_group,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 5) 선호 장르가 있으면 취향 설정도 저장
    if req.genres:
        preference = UserPreference(
            user_id=new_user.id,
            genres=req.genres,
            score_min=1.0,
            score_max=10.0,
        )
        db.add(preference)
        db.commit()

    return {
        "success": True,
        "message": "회원가입이 완료되었습니다.",
        "data": {"user_id": new_user.id, "username": new_user.username},
    }


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    로그인 API
    아이디, 비밀번호를 받아서 JWT 토큰 반환
    """

    # 1) 유저 조회
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )

    # 2) 비밀번호 확인
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )

    # 3) JWT 토큰 생성
    access_token = create_access_token({"user_id": user.id})

    return {
        "success": True,
        "message": "로그인 성공",
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "nickname": user.nickname,
        },
    }