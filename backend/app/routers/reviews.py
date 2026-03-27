import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from app.database import get_db
from app.models.models import User, Review, AiSummary, AnimeCache
from app.schemas.reviews import (
    ReviewCreateRequest, ReviewUpdateRequest, ReviewCreateResponse,
    ReviewListResponse, ReviewStatsResponse, ReviewSummaryResponse
)
from app.core.deps import get_current_user
from app.services.ai import generate_review_summary

router = APIRouter(tags=["리뷰"])


@router.post("/anime/{mal_id}/reviews", response_model=ReviewCreateResponse)
def create_review(
    mal_id: int,
    req: ReviewCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    리뷰 작성 API (로그인 필수)
    평점(1~10) + 텍스트 리뷰 등록
    같은 작품에 중복 리뷰 불가
    """

    # 1) 중복 리뷰 체크
    existing = (
        db.query(Review)
        .filter(Review.user_id == current_user.id, Review.mal_id == mal_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 이 작품에 리뷰를 작성했습니다.",
        )

    # 2) 리뷰 저장
    new_review = Review(
        user_id=current_user.id,
        mal_id=mal_id,
        score=req.score,
        content=req.content,
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    # 3) 기존 AI 요약 캐시 삭제 (새 리뷰가 추가됐으니 요약 갱신 필요)
    db.query(AiSummary).filter(AiSummary.mal_id == mal_id).delete()
    db.commit()

    return {
        "success": True,
        "message": "리뷰가 등록되었습니다.",
        "data": {
            "review_id": new_review.id,
            "mal_id": mal_id,
            "score": new_review.score,
            "content": new_review.content,
        },
    }


@router.put("/anime/{mal_id}/reviews/{review_id}", response_model=ReviewCreateResponse)
def update_review(
    mal_id: int,
    review_id: int,
    req: ReviewUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = db.query(Review).filter(Review.id == review_id, Review.mal_id == mal_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="리뷰를 찾을 수 없습니다.")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="본인의 리뷰만 수정할 수 있습니다.")

    review.score = req.score
    review.content = req.content
    db.commit()
    db.refresh(review)

    # AI 요약 캐시 무효화
    db.query(AiSummary).filter(AiSummary.mal_id == mal_id).delete()
    db.commit()

    return {
        "success": True,
        "message": "리뷰가 수정되었습니다.",
        "data": {"review_id": review.id, "mal_id": mal_id, "score": review.score, "content": review.content},
    }


@router.delete("/anime/{mal_id}/reviews/{review_id}", response_model=ReviewCreateResponse)
def delete_review(
    mal_id: int,
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = db.query(Review).filter(Review.id == review_id, Review.mal_id == mal_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="리뷰를 찾을 수 없습니다.")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="본인의 리뷰만 삭제할 수 있습니다.")

    db.delete(review)
    db.query(AiSummary).filter(AiSummary.mal_id == mal_id).delete()
    db.commit()

    return {
        "success": True,
        "message": "리뷰가 삭제되었습니다.",
        "data": {"review_id": review_id, "mal_id": mal_id},
    }


@router.get("/anime/{mal_id}/reviews", response_model=ReviewListResponse)
def get_reviews(
    mal_id: int,
    sort: str = Query("latest", description="정렬: latest(최신순) 또는 score(평점순)"),
    db: Session = Depends(get_db),
):
    """
    리뷰 목록 조회 API (로그인 불필요)
    최신순 또는 평점순으로 정렬
    닉네임도 함께 반환
    """

    # 1) 정렬 기준 설정
    if sort == "score":
        order = Review.score.desc()
    else:
        order = Review.created_at.desc()

    # 2) 리뷰 조회 (유저 닉네임도 함께)
    reviews = (
        db.query(Review, User.nickname)
        .join(User, Review.user_id == User.id)
        .filter(Review.mal_id == mal_id)
        .order_by(order)
        .all()
    )

    # 3) 응답 데이터 구성
    review_list = []
    for review, nickname in reviews:
        review_list.append({
            "id": review.id,
            "user_id": review.user_id,
            "nickname": nickname,
            "mal_id": review.mal_id,
            "score": review.score,
            "content": review.content,
            "created_at": str(review.created_at),
        })

    return {
        "success": True,
        "message": f"{len(review_list)}개의 리뷰를 조회했습니다.",
        "data": review_list,
    }


@router.get("/anime/{mal_id}/reviews/stats", response_model=ReviewStatsResponse)
def get_review_stats(
    mal_id: int,
    db: Session = Depends(get_db),
):
    """
    리뷰 통계 API (로그인 불필요)
    평균 평점 + 총 리뷰 수 반환
    """

    result = (
        db.query(
            sql_func.avg(Review.score).label("avg_score"),
            sql_func.count(Review.id).label("review_count"),
        )
        .filter(Review.mal_id == mal_id)
        .first()
    )

    avg_score = round(float(result.avg_score), 1) if result.avg_score else 0
    review_count = result.review_count or 0

    return {
        "success": True,
        "message": "리뷰 통계 조회 성공",
        "data": {
            "mal_id": mal_id,
            "avg_score": avg_score,
            "review_count": review_count,
        },
    }


@router.get("/anime/{mal_id}/summary", response_model=ReviewSummaryResponse)
async def get_review_summary(
    mal_id: int,
    db: Session = Depends(get_db),
):
    """
    AI 리뷰 여론 요약 API (로그인 불필요)
    리뷰가 3개 이상일 때만 작동
    캐시에 요약이 있으면 캐시 반환
    """

    # 1) 리뷰 수 확인
    review_count = db.query(Review).filter(Review.mal_id == mal_id).count()

    if review_count < 3:
        return {
            "success": True,
            "message": f"리뷰가 {review_count}개입니다. AI 요약은 리뷰 3개 이상일 때 생성됩니다.",
            "data": None,
        }

    # 2) 캐시에 요약이 있는지 확인
    cached_summary = (
        db.query(AiSummary)
        .filter(AiSummary.mal_id == mal_id)
        .first()
    )

    if cached_summary:
        return {
            "success": True,
            "message": "AI 리뷰 여론 요약 (캐시)",
            "data": {
                "mal_id": mal_id,
                "summary": cached_summary.summary,
                "review_count": review_count,
                "generated_at": str(cached_summary.generated_at),
            },
        }

    # 3) 캐시에 없으면 Gemini로 새로 생성
    reviews = (
        db.query(Review)
        .filter(Review.mal_id == mal_id)
        .order_by(Review.created_at.desc())
        .all()
    )

    review_data = [{"score": r.score, "content": r.content} for r in reviews]

    # 작품 제목 가져오기 (캐시에서)
    cached_anime = db.query(AnimeCache).filter(AnimeCache.mal_id == mal_id).first()
    title = cached_anime.title if cached_anime else f"작품 #{mal_id}"

    # Gemini로 요약 생성
    summary_text = await asyncio.to_thread(generate_review_summary, title, review_data)

    # 4) 캐시에 저장
    new_summary = AiSummary(
        mal_id=mal_id,
        summary=summary_text,
    )
    db.add(new_summary)
    db.commit()
    db.refresh(new_summary)

    return {
        "success": True,
        "message": "AI 리뷰 여론 요약",
        "data": {
            "mal_id": mal_id,
            "summary": summary_text,
            "review_count": review_count,
            "generated_at": str(new_summary.generated_at),
        },
    }