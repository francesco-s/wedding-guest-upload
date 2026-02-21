from fastapi import APIRouter, Depends
from backend.auth import require_admin
from backend.config import PUBLIC_DIR, PRIVATE_DIR
from backend.routers.media_router import _file_info

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/public")
def admin_public(user: dict = Depends(require_admin)):
    files = sorted(PUBLIC_DIR.glob("*"), key=lambda f: f.stat().st_mtime, reverse=True)
    return [_file_info(f, show_author=True) for f in files if f.is_file()]


@router.get("/users")
def admin_users(user: dict = Depends(require_admin)):
    if not PRIVATE_DIR.exists():
        return []
    return [d.name for d in PRIVATE_DIR.iterdir() if d.is_dir()]


@router.get("/private/{username}")
def admin_private_user(username: str, user: dict = Depends(require_admin)):
    user_dir = PRIVATE_DIR / username
    if not user_dir.exists():
        return []
    files = sorted(user_dir.glob("*"), key=lambda f: f.stat().st_mtime, reverse=True)
    return [_file_info(f, show_author=False) for f in files if f.is_file()]
