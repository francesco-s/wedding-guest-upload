import sqlite3
import hashlib
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.config import DB_FILE, SECRET_KEY, ALGORITHM, TOKEN_EXPIRE_MINUTES

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


def login_guest(username: str) -> dict:
    """Login or auto-register a guest by name only, no password."""
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT is_admin FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()

        if row:
            # Existing user — just return (no password check for guests)
            return {"username": username, "is_admin": bool(row[0])}
        else:
            # New user — auto-register
            conn.execute(
                "INSERT INTO users (username, password_hash, is_admin) VALUES (?, '', 0)",
                (username,)
            )
            return {"username": username, "is_admin": False}


def login_admin(username: str, password: str) -> dict:
    """Login for admin — requires password."""
    p_hash = _hash(password)
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT password_hash, is_admin FROM users WHERE username = ?", (username,)
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="Utente non trovato.")

        stored_hash, is_admin = row
        if not is_admin:
            raise HTTPException(status_code=403, detail="Accesso non autorizzato.")
        if stored_hash != p_hash:
            raise HTTPException(status_code=401, detail="Password errata.")

        return {"username": username, "is_admin": True}


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token non valido.")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    return decode_token(credentials.credentials)


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Accesso negato.")
    return user
