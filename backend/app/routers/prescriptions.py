# OWNER: Member 4
from fastapi import APIRouter, Depends, File, UploadFile

from app.auth.dependencies import get_current_user
from app.core.errors import AppError
from app.models.user import User
from app.schemas.prescriptions import ParsedPrescription
from app.services.gemini.prescription_parser import parse_prescription_images

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])
ALLOWED = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 8 * 1024 * 1024
MAX_PHOTOS = 3


@router.post("/parse", response_model=ParsedPrescription)
async def parse(file: UploadFile | None = File(None), files: list[UploadFile] | None = File(None),
                user: User = Depends(get_current_user)):
    """1-3 photos of the same label (send as `files`, or a single `file`). Returns extraction for patient
    confirmation. Does NOT save anything."""
    uploads = [u for u in [file, *(files or [])] if u is not None]
    if not uploads:
        raise AppError("no_file", "Add a photo of the label.", 422)
    if len(uploads) > MAX_PHOTOS:
        raise AppError("too_many_files", f"Send up to {MAX_PHOTOS} photos of the same label.", 413)
    images = []
    for u in uploads:
        if u.content_type not in ALLOWED:
            raise AppError("unsupported_file", "Upload a JPEG, PNG or WebP image.", 415)
        data = await u.read(MAX_BYTES + 1)
        if not data:
            raise AppError("empty_file", "One of the photos is empty. Take it again.", 422)
        if len(data) > MAX_BYTES:
            raise AppError("file_too_large", "Each image must be under 8 MB.", 413)
        images.append((data, u.content_type))
    return await parse_prescription_images(images)
