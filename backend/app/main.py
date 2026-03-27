from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import engine, Base
from app.models.models import (
    User, UserPreference, AnimeCache, Review, Watchlist, AiSummary
)
from app.routers import auth, preferences, anime, reviews, watchlist, profile
from app.core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler,
)

# 테이블 자동 생성
Base.metadata.create_all(bind=engine)

# FastAPI 앱
app = FastAPI(
    title="AniHealing API",
    description="AI 기반 애니메이션 추천 서비스 — 장르·평점 기반 맞춤 추천 + Gemini AI 코멘트",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ===== CORS 설정 =====
# 프론트엔드가 백엔드 API를 호출할 수 있도록 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== 예외 핸들러 등록 =====
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# ===== 라우터 등록 =====
app.include_router(auth.router)
app.include_router(preferences.router)
app.include_router(anime.router)
app.include_router(reviews.router)
app.include_router(watchlist.router)
app.include_router(profile.router)


@app.get("/", tags=["서버 상태"])
def root():
    """서버 상태 확인"""
    return {
        "success": True,
        "message": "AniHealing API is running!",
        "data": None,
    }


@app.get("/health", tags=["서버 상태"])
def health_check():
    """상세 헬스체크"""
    return {
        "success": True,
        "message": "Server is healthy",
        "data": {
            "status": "ok",
            "database": "connected",
        },
    }