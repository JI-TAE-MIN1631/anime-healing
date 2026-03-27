from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_access_token
from app.models.models import User

# Bearer 토큰 방식 인증
security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    현재 로그인한 유저 정보를 가져오는 함수
    API 엔드포인트에서 Depends(get_current_user) 로 사용
    """
    token = credentials.credentials

    # 토큰 해독
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다.",
        )

    # 토큰에서 user_id 꺼내기
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰에 유저 정보가 없습니다.",
        )

    # DB에서 유저 조회
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="존재하지 않는 유저입니다.",
        )

    return user


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_security),
    db: Session = Depends(get_db),
) -> User | None:
    """
    현재 로그인한 유저 정보를 가져오거나, 로그인하지 않았으면 None을 반환
    (로그인이 필수가 아닌 API용)
    """
    if credentials is None:
        return None

    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        return None

    user_id = payload.get("user_id")
    if user_id is None:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user