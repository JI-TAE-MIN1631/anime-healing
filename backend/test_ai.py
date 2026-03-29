"""
google-genai SDK 직접 테스트
실행: python test_ai.py
"""
import os, json
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print(f"API KEY: {api_key[:15]}...\n")

try:
    from google import genai
    print("✅ google-genai 임포트 성공")
except ImportError as e:
    print(f"❌ google-genai 임포트 실패: {e}")
    print("→ pip install google-genai 실행하세요")
    exit()

client = genai.Client(api_key=api_key)

# 간단 텍스트 테스트
print("\n[테스트 1] 단순 응답...")
try:
    r = client.models.generate_content(model="gemini-2.5-flash", contents="안녕하세요, 한국어로 한 문장만 답하세요.")
    print(f"✅ 응답: {r.text}")
except Exception as e:
    print(f"❌ 실패: {e}")

# JSON 응답 테스트
print("\n[테스트 2] JSON 응답...")
try:
    prompt = '''아래 애니메이션 1개에 대해 JSON으로만 응답하세요.
{"comments": ["추천 코멘트"], "synopses": ["줄거리 한국어"], "titles_kr": ["한국어 제목"]}

1번. Blue Seed
- 장르: 액션, 어드벤처
- 평점: 7.0/10'''
    r = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    text = r.text.strip().replace("```json","").replace("```","").strip()
    parsed = json.loads(text)
    print(f"✅ JSON 파싱 성공: {parsed}")
except Exception as e:
    print(f"❌ 실패: {e}")
    import traceback; traceback.print_exc()
