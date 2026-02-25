from fastapi import APIRouter, Depends, HTTPException
from backend.auth import require_admin
from backend.config import DB_FILE, UPLOAD_DIR
import sqlite3
import shutil
import os

router = APIRouter(prefix="/api/admin", tags=["admin"])

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov'}
VIDEO_EXTENSIONS   = {'.mp4', '.mov'}


def _is_video(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in VIDEO_EXTENSIONS


def _parse_author(filename: str) -> str:
    """Filename format: YYYYMMDD_HHMM_Author_UUID.ext"""
    try:
        return filename.split('_')[2]
    except IndexError:
        return ''


def _file_to_dict(filepath: str, base_url: str) -> dict:
    filename = os.path.basename(filepath)
    return {
        "url":      f"{base_url}/{filename}",
        "filename": filename,
        "author":   _parse_author(filename),
        "is_video": _is_video(filename),
    }


# ── Stats ──────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(admin=Depends(require_admin)):
    public_dir = os.path.join(UPLOAD_DIR, "public")
    private_dir = os.path.join(UPLOAD_DIR, "private")

    public_count = 0
    if os.path.exists(public_dir):
        public_count = sum(
            1 for f in os.listdir(public_dir)
            if os.path.splitext(f)[1].lower() in ALLOWED_EXTENSIONS
        )

    private_count = 0
    if os.path.exists(private_dir):
        for user_folder in os.listdir(private_dir):
            user_path = os.path.join(private_dir, user_folder)
            if os.path.isdir(user_path):
                private_count += sum(
                    1 for f in os.listdir(user_path)
                    if os.path.splitext(f)[1].lower() in ALLOWED_EXTENSIONS
                )

    with sqlite3.connect(DB_FILE) as conn:
        user_count = conn.execute(
            "SELECT COUNT(*) FROM users WHERE is_admin = 0"
        ).fetchone()[0]

    return {
        "public":  public_count,
        "users":   user_count,
        "private": private_count,
    }


# ── Public gallery ──────────────────────────────────────────────────────────

@router.get("/public")
def get_public(admin=Depends(require_admin)):
    public_dir = os.path.join(UPLOAD_DIR, "public")
    if not os.path.exists(public_dir):
        return []

    files = sorted(
        [f for f in os.listdir(public_dir)
         if os.path.splitext(f)[1].lower() in ALLOWED_EXTENSIONS],
        reverse=True  # newest first (by filename timestamp prefix)
    )
    return [_file_to_dict(os.path.join(public_dir, f), "/uploads/public") for f in files]


# ── Users ───────────────────────────────────────────────────────────────────

@router.get("/users")
def get_users(admin=Depends(require_admin)):
    private_dir = os.path.join(UPLOAD_DIR, "private")
    public_dir  = os.path.join(UPLOAD_DIR, "public")

    with sqlite3.connect(DB_FILE) as conn:
        rows = conn.execute(
            "SELECT username FROM users WHERE is_admin = 0 ORDER BY username"
        ).fetchall()

    users = []
    for (username,) in rows:
        # Count private files
        user_private_dir = os.path.join(private_dir, username)
        private_count = 0
        if os.path.exists(user_private_dir):
            private_count = sum(
                1 for f in os.listdir(user_private_dir)
                if os.path.splitext(f)[1].lower() in ALLOWED_EXTENSIONS
            )

        # Count public files (by author in filename)
        public_count = 0
        if os.path.exists(public_dir):
            public_count = sum(
                1 for f in os.listdir(public_dir)
                if _parse_author(f).lower() == username.lower()
                and os.path.splitext(f)[1].lower() in ALLOWED_EXTENSIONS
            )

        users.append({
            "username":      username,
            "public_count":  public_count,
            "private_count": private_count,
            "total":         public_count + private_count,
        })

    return users


# ── Delete user ──────────────────────────────────────────────────────────────

@router.delete("/users/{username}")
def delete_user(username: str, admin=Depends(require_admin)):
    if username.lower() == "admin":
        raise HTTPException(400, "Non puoi eliminare l'account admin.")

    with sqlite3.connect(DB_FILE) as conn:
        user = conn.execute(
            "SELECT username FROM users WHERE username = ?", (username,)
        ).fetchone()
        if not user:
            raise HTTPException(404, "Utente non trovato.")
        conn.execute("DELETE FROM users WHERE username = ?", (username,))

    # Delete private folder
    private_folder = os.path.join(UPLOAD_DIR, "private", username)
    if os.path.exists(private_folder):
        shutil.rmtree(private_folder)

    # Delete public files uploaded by this user
    public_dir = os.path.join(UPLOAD_DIR, "public")
    if os.path.exists(public_dir):
        for f in os.listdir(public_dir):
            if _parse_author(f).lower() == username.lower():
                os.remove(os.path.join(public_dir, f))

    return {"ok": True, "deleted": username}


# ── Private folder for one user ──────────────────────────────────────────────

@router.get("/private/{username}")
def get_private(username: str, admin=Depends(require_admin)):
    user_dir = os.path.join(UPLOAD_DIR, "private", username)
    if not os.path.exists(user_dir):
        return []

    files = sorted(
        [f for f in os.listdir(user_dir)
         if os.path.splitext(f)[1].lower() in ALLOWED_EXTENSIONS],
        reverse=True
    )
    return [
        _file_to_dict(
            os.path.join(user_dir, f),
            f"/uploads/private/{username}"
        )
        for f in files
    ]
