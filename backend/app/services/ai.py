from google import genai
from dotenv import load_dotenv
import os
import json

load_dotenv()

# Gemini API 설정
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.5-flash"


def generate_ai_comments_batch(anime_list: list[dict]) -> list[str]:
    """
    여러 애니메이션의 AI 추천 코멘트를 한 번에 생성 (Gemini)
    API 호출 1번으로 전부 처리
    """
    try:
        anime_info = ""
        for i, anime in enumerate(anime_list):
            anime_info += f"""
{i + 1}번. {anime['title']}
- 장르: {', '.join(anime['genres'])}
- 평점: {anime['score']}/10
- 줄거리: {anime.get('synopsis', '정보 없음')[:100]}
"""

        prompt = f"""당신은 애니메이션 추천 전문가입니다.
아래 애니메이션들에 대해 각각 한국어로 2~3문장의 짧은 추천 코멘트를 작성해주세요.
따뜻하고 친근한 톤으로 작성해주세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 하지 마세요.
{{"comments": ["1번 코멘트", "2번 코멘트", ...]}}

애니메이션 목록:
{anime_info}"""

        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
        )
        response_text = response.text.strip()

        # JSON 파싱 (마크다운 코드블록 제거)
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(response_text)
        comments = parsed.get("comments", [])

        while len(comments) < len(anime_list):
            comments.append("이 작품을 한번 감상해보세요!")

        return comments

    except Exception as e:
        print(f"AI 코멘트 일괄 생성 실패: {e}")
        return ["이 작품을 한번 감상해보세요!"] * len(anime_list)


def generate_ai_comment(title: str, genres: list[str], score: float, synopsis: str) -> str:
    """
    단일 애니메이션 AI 추천 코멘트 생성 (Gemini)
    """
    try:
        prompt = f"""당신은 애니메이션 추천 전문가입니다.
아래 애니메이션 정보를 보고, 이 작품을 왜 추천하는지 한국어로 2~3문장의 짧은 추천 코멘트를 작성해주세요.
따뜻하고 친근한 톤으로 작성해주세요.
추천 코멘트만 작성하고 다른 설명은 하지 마세요.

작품명: {title}
장르: {', '.join(genres)}
평점: {score}/10
줄거리: {synopsis[:200] if synopsis else '정보 없음'}"""

        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
        )
        return response.text.strip()

    except Exception as e:
        print(f"AI 코멘트 생성 실패: {e}")
        return "이 작품을 한번 감상해보세요!"


def generate_review_summary(title: str, reviews: list[dict]) -> str:
    """
    AI 리뷰 여론 요약 (Gemini)
    """
    try:
        review_texts = ""
        for review in reviews[:10]:
            review_texts += f"- 평점 {review['score']}/10: {review['content']}\n"

        prompt = f"""아래는 애니메이션 '{title}'에 대한 유저 리뷰들입니다.
이 리뷰들의 전체적인 여론을 한국어로 3~4문장으로 요약해주세요.
긍정적인 의견과 부정적인 의견을 균형있게 반영해주세요.
요약만 작성하고 다른 설명은 하지 마세요.

리뷰 목록:
{review_texts}"""

        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
        )
        return response.text.strip()

    except Exception as e:
        print(f"AI 리뷰 요약 실패: {e}")
        return "리뷰 요약을 생성할 수 없습니다."


