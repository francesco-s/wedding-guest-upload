from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DB_FILE = DATA_DIR / "guests.db"
UPLOAD_DIR = DATA_DIR / "uploads"
PUBLIC_DIR = UPLOAD_DIR / "public"
PRIVATE_DIR = UPLOAD_DIR / "private"

# App Settings
APP_TITLE = "Libro degli Ospiti"
APP_ICON = "💍"
ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.mov']

# Ensure directories exist
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
PRIVATE_DIR.mkdir(parents=True, exist_ok=True)
