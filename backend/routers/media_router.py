import uuid
import aiofiles
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
from ..auth import get_current_user
from ..config import PUBLIC_DIR, PRIVATE_DIR, ALLOWED_EXTENSIONS

router = APIRouter(prefix="/api/media", tags=["media"])


def _safe(name: str) -> str:
    return "".join(c for c in name if c.isalnum())


def _save_path(filename: str, author: str, is_public: bool) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    uid = str(uuid.uuid4())[:6]
    safe_author = _safe(author)
    suffix = Path(filename).suffix.lower()
    new_name = f"{timestamp}_{safe_author}_{uid}{suffix}"

    if is_public:
        return PUBLIC_DIR / new_name
    else:
        user_dir = PRIVATE_DIR / safe_author
        user_dir.mkdir(exist_ok=True)
        return user_dir / new_name


@router.post("/upload")
async def upload(
    files: list[UploadFile] = File(...),
    is_private: bool = Form(False),
    user: dict = Depends(get_current_user)
):
    author = user["sub"]
    uploaded = []

    for file in files:
        suffix = Path(file.filename).suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS:
            raise HTTPException(400, f"Formato non supportato: {suffix}")

        save_path = _save_path(file.filename, author, not is_private)

        async with aiofiles.open(save_path, "wb") as f:
            content = await file.read()
            await f.write(content)

        uploaded.append(save_path.name)

    return {"uploaded": uploaded, "count": len(uploaded)}


@router.get("/public")
def get_public(user: dict = Depends(get_current_user)):
    files = sorted(PUBLIC_DIR.glob("*"), key=lambda f: f.stat().st_mtime, reverse=True)
    return [_file_info(f, show_author=True) for f in files if f.is_file()]


@router.get("/private")
def get_private(user: dict = Depends(get_current_user)):
    safe_author = _safe(user["sub"])
    user_dir = PRIVATE_DIR / safe_author
    if not user_dir.exists():
        return []
    files = sorted(user_dir.glob("*"), key=lambda f: f.stat().st_mtime, reverse=True)
    return [_file_info(f, show_author=False) for f in files if f.is_file()]


def _file_info(f: Path, show_author: bool) -> dict:
    suffix = f.suffix.lower()
    is_video = suffix in {".mp4", ".mov"}
    author = ""
    if show_author:
        try:
            author = f.name.split("_")[2]
        except IndexError:
            pass
    return {
        "filename": f.name,
        "url": f"/uploads/{'public' if PUBLIC_DIR in f.parents else f'private/{f.parent.name}'}/{f.name}",
        "is_video": is_video,
        "author": author
    }
