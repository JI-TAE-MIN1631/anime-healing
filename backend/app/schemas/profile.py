from pydantic import BaseModel, Field, field_validator, model_validator
import re


class UserProfileResponse(BaseModel):
    success: bool = True
    message: str
    data: dict


class UpdateNicknameRequest(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=50, examples=["새닉네임"])


class UpdatePasswordRequest(BaseModel):
    current_password: str = Field(..., examples=["OldPass1234"])
    new_password: str = Field(..., min_length=10, max_length=100, examples=["NewPass1234"])
    new_password_confirm: str = Field(..., examples=["NewPass1234"])

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
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
        if self.new_password != self.new_password_confirm:
            raise ValueError("새 비밀번호가 일치하지 않습니다.")
        return self
