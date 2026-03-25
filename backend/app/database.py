from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

# .env 파일에서 환경변수 로드
load_dotenv()

DATABASE_URL = os.getenv("DB_URL")

# SQLAlchemy 엔진 생성
engine = create_engine(
    DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
)

# 세션 팩토리
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 모델 베이스 클래스
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()