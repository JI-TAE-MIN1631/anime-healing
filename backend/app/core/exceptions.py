from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    HTTPException 핸들러
    401, 400, 404 등 우리가 직접 raise한 에러를 처리
    """
    # detail이 한국어 문자열이면 그대로 사용
    message = exc.detail if isinstance(exc.detail, str) else "요청을 처리할 수 없습니다."

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": message,
            "data": None,
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    유효성 검사 에러 핸들러 (422 에러)
    Pydantic 검증 실패 시 한국어 메시지로 변환
    """
    errors = exc.errors()
    
    # 첫 번째 에러 메시지를 한국어로 변환
    if errors:
        error = errors[0]
        field = error.get("loc", ["", ""])[-1]  # 필드명
        error_type = error.get("type", "")
        error_msg = error.get("msg", "")
        ctx = error.get("ctx", {})

        # Pydantic 에러 타입별 한국어 메시지
        message = translate_validation_error(field, error_type, error_msg, ctx)
    else:
        message = "입력 데이터가 올바르지 않습니다."

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": message,
            "data": None,
        },
    )


def translate_validation_error(field: str, error_type: str, error_msg: str, ctx: dict) -> str:
    """
    Pydantic 에러를 한국어로 번역
    """
    # 필드명 한국어 매핑
    field_names = {
        "username": "아이디",
        "email": "이메일",
        "nickname": "닉네임",
        "password": "비밀번호",
        "password_confirm": "비밀번호 확인",
        "gender": "성별",
        "age_group": "연령대",
        "genres": "장르",
        "score": "평점",
        "content": "리뷰 내용",
        "score_min": "최소 평점",
        "score_max": "최대 평점",
        "mal_id": "작품 ID",
    }

    field_kr = field_names.get(field, field)

    # value_error는 우리가 직접 작성한 한국어 메시지
    if error_type == "value_error":
        # "Value error, 비밀번호가 일치하지 않습니다." 형태에서 한국어 부분만 추출
        if "," in error_msg:
            return error_msg.split(",", 1)[1].strip()
        return error_msg

    # 에러 타입별 한국어 변환
    if error_type == "missing":
        return f"{field_kr}은(는) 필수 입력 항목입니다."

    if error_type == "string_too_short":
        min_length = ctx.get("min_length", "")
        return f"{field_kr}은(는) {min_length}자 이상 입력해야 합니다."

    if error_type == "string_too_long":
        max_length = ctx.get("max_length", "")
        return f"{field_kr}은(는) {max_length}자 이하로 입력해야 합니다."

    if error_type == "greater_than_equal":
        ge = ctx.get("ge", "")
        return f"{field_kr}은(는) {ge} 이상이어야 합니다."

    if error_type == "less_than_equal":
        le = ctx.get("le", "")
        return f"{field_kr}은(는) {le} 이하여야 합니다."

    if error_type == "json_invalid":
        return "올바른 JSON 형식이 아닙니다."

    if error_type == "list_type":
        return f"{field_kr}은(는) 목록(배열) 형식이어야 합니다."

    if error_type == "int_type":
        return f"{field_kr}은(는) 정수여야 합니다."

    if error_type == "float_type":
        return f"{field_kr}은(는) 숫자여야 합니다."

    if error_type == "too_short":
        min_length = ctx.get("min_length", "")
        return f"{field_kr}은(는) 최소 {min_length}개 이상 선택해야 합니다."

    # 기본 메시지
    return f"{field_kr} 입력이 올바르지 않습니다."


async def general_exception_handler(request: Request, exc: Exception):
    """
    예상치 못한 서버 에러 (500)
    """
    print(f"서버 에러 발생: {exc}")

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "data": None,
        },
    )