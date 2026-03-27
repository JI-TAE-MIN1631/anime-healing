from pydantic import BaseModel, Field
from typing import Optional


class ReviewCreateRequest(BaseModel):
    """리뷰 작성 요청"""
    score: float = Field(..., ge=1.0, le=10.0, examples=[8.5])
    content: str = Field(..., min_length=5, max_length=1000, examples=["정말 재미있는 작품이었습니다!"])


class ReviewListResponse(BaseModel):
    """리뷰 목록 응답"""
    success: bool = True
    message: str
    data: list[dict]


class ReviewStatsResponse(BaseModel):
    """리뷰 통계 응답"""
    success: bool = True
    message: str
    data: dict


class ReviewCreateResponse(BaseModel):
    """리뷰 작성 응답"""
    success: bool = True
    message: str
    data: dict


class ReviewSummaryResponse(BaseModel):
    """AI 리뷰 요약 응답"""
    success: bool = True
    message: str
    data: Optional[dict] = None