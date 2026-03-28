from rest_framework.views import exception_handler


def unified_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    request = context.get("request")
    path = request.path if request else None

    detail = response.data
    if isinstance(detail, dict) and "detail" in detail and len(detail) == 1:
        message = detail["detail"]
    else:
        message = "Validation error"

    response.data = {
        "success": False,
        "error": {
            "code": response.status_code,
            "message": message,
            "details": detail,
        },
        "meta": {"path": path},
    }
    return response