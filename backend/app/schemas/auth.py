from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
import re


class SignupRequest(BaseModel):
    """회원가입 요청 데이터"""
    username: str = Field(..., min_length=3, max_length=50, examples=["testuser"])
    email: str = Field(..., max_length=100, examples=["test@example.com"])
    nickname: str = Field(..., min_length=1, max_length=50, examples=["테스트유저"])
    password: str = Field(..., min_length=10, max_length=100, examples=["Test1234!!"])
    password_confirm: str = Field(..., examples=["Test1234!!"])
    gender: str = Field(..., examples=["남성"])
    age_group: str = Field(..., examples=["20대"])
    genres: Optional[list[int]] = Field(None, examples=[[1, 22, 36]])

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        """아이디: 영문자+숫자 조합, 3~50자"""
        if not re.match(r"^[a-zA-Z0-9]+$", v):
            raise ValueError("아이디는 영문자와 숫자만 사용할 수 있습니다.")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        """이메일 형식 검사"""
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", v):
            raise ValueError("올바른 이메일 형식이 아닙니다.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        """
        비밀번호 규칙:
        - 10자 이상
        - 영문 대문자 1개 이상
        - 영문 소문자 1개 이상
        - 숫자 1개 이상
        """
        if len(v) < 10:
            raise ValueError("비밀번호는 10자 이상이어야 합니다.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("비밀번호에 영문 대문자가 1개 이상 포함되어야 합니다.")
        if not re.search(r"[a-z]", v):
            raise ValueError("비밀번호에 영문 소문자가 1개 이상 포함되어야 합니다.")
        if not re.search(r"[0-9]", v):
            raise ValueError("비밀번호에 숫자가 1개 이상 포함되어야 합니다.")
        return v

    @model_validator(mode="after")
    def check_password_match(self):
        """비밀번호 확인 일치 검사"""
        if self.password != self.password_confirm:
            raise ValueError("비밀번호가 일치하지 않습니다.")
        return self

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v):
        """성별: 남성/여성/선택안함 중 하나"""
        allowed = ["남성", "여성", "선택안함"]
        if v not in allowed:
            raise ValueError(f"성별은 {', '.join(allowed)} 중 하나여야 합니다.")
        return v

    @field_validator("age_group")
    @classmethod
    def validate_age_group(cls, v):
        """연령대: 지정된 값 중 하나"""
        allowed = ["10대", "20대", "30대", "40대", "50대+"]
        if v not in allowed:
            raise ValueError(f"연령대는 {', '.join(allowed)} 중 하나여야 합니다.")
        return v


class LoginRequest(BaseModel):
    """로그인 요청 데이터"""
    username: str = Field(..., examples=["testuser"])
    password: str = Field(..., examples=["Test1234!!"])


class TokenResponse(BaseModel):
    """로그인 성공 시 응답 데이터"""
    success: bool = True
    message: str = "로그인 성공"
    data: dict


class UserResponse(BaseModel):
    """유저 정보 응답 데이터"""
    id: int
    username: str
    email: str
    nickname: str
    gender: str
    age_group: str


class MessageResponse(BaseModel):
    """일반 메시지 응답"""
    success: bool
    message: str
    data: Optional[dict] = None