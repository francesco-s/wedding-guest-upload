from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DB_FILE = DATA_DIR / "guests.db"
UPLOAD_DIR = DATA_DIR / "uploads"
PUBLIC_DIR = UPLOAD_DIR / "public"
PRIVATE_DIR = UPLOAD_DIR / "private"
FRONTEND_DIR = BASE_DIR / "frontend"

# JWT Settings
SECRET_KEY = "change-this-in-production-please"
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 ore

APP_TITLE = "Wedding Guest Book"
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.mp4', '.mov'}

# Ensure directories exist
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
PRIVATE_DIR.mkdir(parents=True, exist_ok=True)
