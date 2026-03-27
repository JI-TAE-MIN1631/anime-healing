from pydantic import BaseModel, Field
from typing import Optional


class WatchlistToggleRequest(BaseModel):
    """보고싶다 추가/삭제 요청"""
    mal_id: int = Field(..., examples=[21])


class WatchlistToggleResponse(BaseModel):
    """보고싶다 추가/삭제 응답"""
    success: bool = True
    message: str
    data: dict


class WatchlistListResponse(BaseModel):
    """보고싶다 목록 응답"""
    success: bool = True
    message: str
    data: list[dict]


class WatchlistDeleteResponse(BaseModel):
    """보고싶다 개별 삭제 응답"""
    success: bool = True
    message: str
    data: Optional[dict] = None