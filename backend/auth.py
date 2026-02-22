import sqlite3
import hashlib
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import DB_FILE, SECRET_KEY, ALGORITHM, TOKEN_EXPIRE_MINUTES

bearer_scheme = HTTPBearer()


def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password_hash TEXT,
                is_admin INTEGER DEFAULT 0
            )
        """)
        admin_hash = hashlib.sha256("admin123".encode()).hexdigest()
        try:
            conn.execute(
                "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)",
                ("admin", admin_hash)
            )
        except sqlite3.IntegrityError:
            pass


def _hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def login_or_register(username: str, password: str) -> dict:
    p_hash = _hash(password)
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash, is_admin FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()

        if row:
            stored_hash, is_admin = row
            if stored_hash != p_hash:
                raise HTTPException(status_code=401, detail="Password errata.")
            return {"username": username, "is_admin": bool(is_admin)}
        else:
            conn.execute(
                "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 0)",
                (username, p_hash)
            )
            return {"username": username, "is_admin": False}


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token non valido.")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    return decode_token(credentials.credentials)


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Accesso negato.")
    return user
