from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.auth import login_guest, login_admin, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class GuestLoginRequest(BaseModel):
    username: str


class AdminLoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: GuestLoginRequest):
    """Guest login — name only."""
    username = body.username.strip()

    if not username:
        raise HTTPException(400, "Inserisci il tuo nome.")
    if len(username) < 2:
        raise HTTPException(400, "Il nome deve avere almeno 2 caratteri.")
    if len(username) > 40:
        raise HTTPException(400, "Il nome è troppo lungo.")

    # Block guests from logging in as admin via this endpoint
    if username.lower() == "admin":
        raise HTTPException(403, "Usa il login admin.")

    user = login_guest(username)
    token = create_token({"sub": user["username"], "is_admin": user["is_admin"]})
    return {
        "access_token": token,
        "username": user["username"],
        "is_admin": user["is_admin"]
    }


@router.post("/admin-login")
def admin_login(body: AdminLoginRequest):
    """Admin login — requires password."""
    user = login_admin(body.username.strip(), body.password)
    token = create_token({"sub": user["username"], "is_admin": True})
    return {
        "access_token": token,
        "username": user["username"],
        "is_admin": True
    }
