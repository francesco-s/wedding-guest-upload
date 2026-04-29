import uuid
import aiofiles
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from ..auth import get_current_user
from ..config import PUBLIC_DIR, PRIVATE_DIR, ALLOWED_EXTENSIONS

router = APIRouter(prefix="/api/media", tags=["media"])

VIDEO_EXTENSIONS = {".mp4", ".mov"}


# ── Helpers ────────────────────────────────────────────────────────────────

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


def _make_thumb(src: Path) -> Path | None:
    """Generate a 600x600 JPEG thumbnail next to the original. Skip videos."""
    if src.suffix.lower() in VIDEO_EXTENSIONS:
        return None
    thumb = src.parent / f"thumb_{src.stem}.jpg"
    if thumb.exists():
        return thumb
    try:
        from PIL import Image
        with Image.open(src) as img:
            img.thumbnail((600, 600))
            img.convert("RGB").save(thumb, "JPEG", quality=72, optimize=True)
        return thumb
    except Exception:
        return None


def _url_for(f: Path) -> str:
    """Build the /uploads/... URL for a file."""
    if PUBLIC_DIR in f.parents:
        return f"/uploads/public/{f.name}"
    return f"/uploads/private/{f.parent.name}/{f.name}"


def _file_info(f: Path, show_author: bool) -> dict:
    suffix = f.suffix.lower()
    is_video = suffix in VIDEO_EXTENSIONS

    author = ""
    if show_author:
        try:
            author = f.name.split("_")[2]
        except IndexError:
            pass

    thumb = f.parent / f"thumb_{f.stem}.jpg"
    thumb_url = _url_for(thumb) if thumb.exists() else _url_for(f)

    return {
        "filename":  f.name,
        "url":       _url_for(f),
        "thumb_url": thumb_url,
        "is_video":  is_video,
        "author":    author,
    }


# ── Routes ─────────────────────────────────────────────────────────────────

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

        # Generate thumbnail synchronously (fast for mobile-sized uploads)
        _make_thumb(save_path)

        uploaded.append(save_path.name)

    return {"uploaded": uploaded, "count": len(uploaded)}


@router.get("/public")
def get_public(user: dict = Depends(get_current_user)):
    files = sorted(PUBLIC_DIR.glob("*"), key=lambda f: f.stat().st_mtime, reverse=True)
    # Exclude thumb_ files from the listing
    return [_file_info(f, show_author=True) for f in files
            if f.is_file() and not f.name.startswith("thumb_")]


@router.get("/private")
def get_private(user: dict = Depends(get_current_user)):
    safe_author = _safe(user["sub"])
    user_dir = PRIVATE_DIR / safe_author
    if not user_dir.exists():
        return []
    files = sorted(user_dir.glob("*"), key=lambda f: f.stat().st_mtime, reverse=True)
    return [_file_info(f, show_author=False) for f in files
            if f.is_file() and not f.name.startswith("thumb_")]