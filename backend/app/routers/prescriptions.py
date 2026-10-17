# OWNER: Member 4
from fastapi import APIRouter, Depends, File, UploadFile

from app.auth.dependencies import get_current_user
from app.core.errors import AppError
from app.models.user import User
from app.schemas.prescriptions import ParsedPrescription
from app.services.gemini.prescription_parser import parse_prescription_image

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])
ALLOWED = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 8 * 1024 * 1024


@router.post("/parse", response_model=ParsedPrescription)
async def parse(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Returns extraction for patient confirmation. Does NOT save anything."""
    if file.content_type not in ALLOWED:
        raise AppError("unsupported_file", "Upload a JPEG, PNG or WebP image.", 415)
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise AppError("file_too_large", "Image must be under 8 MB.", 413)
    return await parse_prescription_image(data, file.content_type)
