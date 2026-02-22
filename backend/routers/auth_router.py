from fastapi import APIRouter
from pydantic import BaseModel
from ..auth import login_or_register, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: LoginRequest):
    user = login_or_register(body.username, body.password)
    token = create_token({"sub": user["username"], "is_admin": user["is_admin"]})
    return {
        "access_token": token,
        "username": user["username"],
        "is_admin": user["is_admin"]
    }
