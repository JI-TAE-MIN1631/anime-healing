from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, JSON, ForeignKey
)
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    nickname = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    gender = Column(String(10), nullable=False)
    age_group = Column(String(10), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    genres = Column(JSON)
    score_min = Column(Float, default=1.0)
    score_max = Column(Float, default=10.0)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )


class AnimeCache(Base):
    __tablename__ = "anime_cache"

    mal_id = Column(Integer, primary_key=True)
    title = Column(String(255))
    title_kr = Column(String(255), nullable=True)
    genres = Column(JSON)
    score = Column(Float)
    synopsis = Column(Text)
    image_url = Column(String(500))
    image_url_large = Column(String(500), nullable=True)
    ai_comment = Column(Text, nullable=True)
    synopsis_kr = Column(Text, nullable=True)
    cached_at = Column(DateTime, server_default=func.now())


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    mal_id = Column(Integer, nullable=False)
    score = Column(Float, nullable=False)
    content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    mal_id = Column(Integer, nullable=False)
    added_at = Column(DateTime, server_default=func.now())


class SearchCache(Base):
    __tablename__ = "search_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cache_key = Column(String(255), unique=True, nullable=False)
    mal_ids = Column(JSON)
    cached_at = Column(DateTime, server_default=func.now())


class AiSummary(Base):
    __tablename__ = "ai_summaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mal_id = Column(Integer, nullable=False)
    summary = Column(Text)
    generated_at = Column(DateTime, server_default=func.now())