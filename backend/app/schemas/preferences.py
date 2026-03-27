from pydantic import BaseModel, Field, model_validator
from typing import Optional


class PreferenceRequest(BaseModel):
    """취향 설정 저장 요청"""
    genres: list[int] = Field(..., min_length=1, examples=[[1, 22, 36]])
    score_min: float = Field(..., ge=1.0, le=10.0, examples=[5.0])
    score_max: float = Field(..., ge=1.0, le=10.0, examples=[10.0])

    @model_validator(mode="after")
    def check_score_range(self):
        """score_min이 score_max보다 작은지 검사"""
        if self.score_min >= self.score_max:
            raise ValueError("최소 평점은 최대 평점보다 작아야 합니다.")
        return self


class PreferenceResponse(BaseModel):
    """취향 설정 조회 응답"""
    success: bool = True
    message: str = "취향 설정 조회 성공"
    data: Optional[dict] = None


class GenreListResponse(BaseModel):
    """장르 목록 응답"""
    success: bool = True
    message: str = "장르 목록 조회 성공"
    data: list[dict]