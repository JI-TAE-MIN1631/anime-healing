"""
DB 마이그레이션 스크립트
anime_cache 테이블에 title_kr, image_url_large, ai_comment 컬럼 추가
기존 캐시의 영어 장르명을 한국어로 업데이트

실행 방법 (backend/ 디렉토리에서):
    python migrate.py
"""
import json
from sqlalchemy import text
from app.database import engine
from app.core.genres import GENRE_EN_TO_KR


def migrate():
    with engine.connect() as conn:
        # 1) 컬럼 추가
        for column, definition in [
            ("title_kr", "VARCHAR(255) NULL"),
            ("image_url_large", "VARCHAR(500) NULL"),
            ("ai_comment", "TEXT NULL"),
        ]:
            try:
                conn.execute(text(
                    f"ALTER TABLE anime_cache ADD COLUMN {column} {definition}"
                ))
                conn.commit()
                print(f"✅ {column} 컬럼 추가 완료")
            except Exception as e:
                if "Duplicate column" in str(e) or "already exists" in str(e).lower():
                    print(f"ℹ️  {column} 컬럼 이미 존재 (건너뜀)")
                else:
                    print(f"❌ {column} 오류: {e}")

        # 2) 기존 캐시의 영어 장르명 → 한국어 업데이트
        print("\n장르명 한국어 변환 중...")
        rows = conn.execute(text("SELECT mal_id, genres FROM anime_cache")).fetchall()
        updated = 0
        for row in rows:
            try:
                genres = json.loads(row[1]) if isinstance(row[1], str) else row[1]
                if not genres:
                    continue
                new_genres = [GENRE_EN_TO_KR.get(g, g) for g in genres]
                if new_genres != genres:
                    conn.execute(
                        text("UPDATE anime_cache SET genres = :g WHERE mal_id = :id"),
                        {"g": json.dumps(new_genres, ensure_ascii=False), "id": row[0]}
                    )
                    updated += 1
            except Exception:
                pass
        conn.commit()
        print(f"✅ {updated}개 항목 장르명 한국어로 업데이트 완료")

    print("\n마이그레이션 완료!")


if __name__ == "__main__":
    migrate()
