from google import genai
from dotenv import load_dotenv
import os
import json
import traceback

load_dotenv()

# Gemini API 설정
_api_key = os.getenv("GEMINI_API_KEY")
print(f"[AI] GEMINI_API_KEY 로드됨: {'있음' if _api_key else '없음(확인필요)'}")
client = genai.Client(api_key=_api_key)
MODEL = "gemini-2.5-flash"


def generate_comments_and_synopses_batch(anime_list: list[dict]) -> tuple[list[str], list[str], list[str]]:
    """
    AI 추천 코멘트 + 시놉시스 한국어 번역 + 제목 한국어 번역을 한 번에 생성 (API 1회 호출)
    """
    try:
        anime_info = ""
        for i, anime in enumerate(anime_list):
            anime_info += f"""
{i + 1}번. {anime['title']}
- 장르: {', '.join(anime['genres'])}
- 평점: {anime['score']}/10
- 줄거리: {anime.get('synopsis', '정보 없음')[:200]}
"""

        prompt = f"""당신은 애니메이션 추천 전문가입니다.
아래 애니메이션들에 대해 세 가지 작업을 해주세요:
1. 각 작품마다 한국어로 2~3문장의 짧은 추천 코멘트 작성 (따뜻하고 친근한 톤)
2. 각 작품의 영어 줄거리를 한국어로 3~4문장으로 간결하게 번역
3. 각 작품의 제목을 한국어로 번역 (공식 한국어 제목이 있으면 사용, 없으면 자연스럽게 번역)

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 하지 마세요.
{{"comments": ["1번 코멘트", ...], "synopses": ["1번 한국어 줄거리", ...], "titles_kr": ["1번 한국어 제목", ...]}}

애니메이션 목록:
{anime_info}"""

        response = client.models.generate_content(model=MODEL, contents=prompt)
        response_text = response.text.strip()

        response_text = response_text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(response_text)

        comments = parsed.get("comments", [])
        synopses = parsed.get("synopses", [])
        titles_kr = parsed.get("titles_kr", [])

        while len(comments) < len(anime_list):
            comments.append("이 작품을 한번 감상해보세요!")
        while len(synopses) < len(anime_list):
            idx = len(synopses)
            synopses.append(anime_list[idx].get("synopsis", "줄거리 정보가 없습니다."))
        while len(titles_kr) < len(anime_list):
            idx = len(titles_kr)
            titles_kr.append(anime_list[idx].get("title", ""))

        return comments, synopses, titles_kr

    except Exception as e:
        print(f"AI 코멘트+시놉시스 일괄 생성 실패: {e}")
        traceback.print_exc()
        default_comments = ["이 작품을 한번 감상해보세요!"] * len(anime_list)
        default_synopses = [a.get("synopsis", "줄거리 정보가 없습니다.") for a in anime_list]
        default_titles_kr = [a.get("title", "") for a in anime_list]
        return default_comments, default_synopses, default_titles_kr


def translate_title(title: str) -> str:
    """
    애니메이션 제목을 한국어로 번역 (상세 페이지 단일 호출용)
    """
    if not title:
        return title

    try:
        prompt = f"""아래 애니메이션 제목을 한국어로 번역해주세요.
공식 한국어 제목이 있으면 그것을 사용하고, 없으면 자연스럽게 번역해주세요.
번역된 제목만 한 줄로 작성하고 다른 설명은 하지 마세요.

제목: {title}"""

        response = client.models.generate_content(model=MODEL, contents=prompt)
        return response.text.strip()

    except Exception as e:
        print(f"제목 번역 실패: {e}")
        return title


def translate_synopsis(synopsis: str) -> str:
    """
    영어 시놉시스를 한국어로 번역 (단일 작품용)
    """
    if not synopsis:
        return "줄거리 정보가 없습니다."

    try:
        prompt = f"""아래 애니메이션 줄거리를 자연스러운 한국어로 3~4문장으로 간결하게 번역해주세요.
번역만 작성하고 다른 설명은 하지 마세요.

영어 줄거리:
{synopsis[:500]}"""

        response = client.models.generate_content(model=MODEL, contents=prompt)
        return response.text.strip()

    except Exception as e:
        print(f"시놉시스 번역 실패: {e}")
        return synopsis


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

        response = client.models.generate_content(model=MODEL, contents=prompt)
        return response.text.strip()

    except Exception as e:
        print(f"AI 리뷰 요약 실패: {e}")
        return "리뷰 요약을 생성할 수 없습니다."