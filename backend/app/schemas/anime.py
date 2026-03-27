from pydantic import BaseModel, Field
from typing import Optional


class AnimeSearchRequest(BaseModel):
    """애니 직접 검색 요청 (쿼리 파라미터용 참고)"""
    genres: str = Field(..., examples=["1,22,36"])
    score_min: float = Field(1.0, ge=1.0, le=10.0)
    score_max: float = Field(10.0, ge=1.0, le=10.0)
    page: int = Field(1, ge=1)


class AnimeItem(BaseModel):
    """애니 카드 하나의 데이터"""
    mal_id: int
    title: str
    genres: list[str]
    score: Optional[float] = None
    synopsis: Optional[str] = None
    image_url: Optional[str] = None
    episodes: Optional[int] = None
    year: Optional[int] = None


class AnimeListResponse(BaseModel):
    """애니 목록 응답"""
    success: bool = True
    message: str
    data: list[dict]


class AnimeDetailResponse(BaseModel):
    """애니 상세 응답"""
    success: bool = True
    message: str
    data: Optional[dict] = None