from fastapi import FastAPI
from app.database import engine, Base
from app.models.models import (
    User, UserPreference, AnimeCache, Review, Watchlist, AiSummary
)

# 테이블 자동 생성
Base.metadata.create_all(bind=engine)

# FastAPI 앱
app = FastAPI(
    title="AniHealing API",
    description="AI 기반 애니메이션 추천 서비스",
    version="1.0.0",
)


@app.get("/", tags=["Health Check"])
def root():
    return {
        "success": True,
        "message": "AniHealing API is running!",
        "data": None,
    }


@app.get("/health", tags=["Health Check"])
def health_check():
    return {
        "success": True,
        "message": "Server is healthy",
        "data": {
            "status": "ok",
            "database": "connected",
        },
    }