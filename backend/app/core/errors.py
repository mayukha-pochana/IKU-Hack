# OWNER: Member 3 - consistent error format: {"error": {"code","message","details"}}
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: dict | None = None):
        self.code, self.message, self.status_code, self.details = code, message, status_code, details or {}


def _body(code, message, details=None):
    return {"error": {"code": code, "message": message, "details": details or {}}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_err(_: Request, e: AppError):
        return JSONResponse(_body(e.code, e.message, e.details), status_code=e.status_code)

    @app.exception_handler(RequestValidationError)
    async def _val_err(_: Request, e: RequestValidationError):
        return JSONResponse(_body("validation_error", "Invalid request", {"errors": e.errors()}), status_code=422)
