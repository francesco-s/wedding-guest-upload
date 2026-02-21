import uuid
from datetime import datetime
from config import PUBLIC_DIR, PRIVATE_DIR

def save_media(uploaded_file, author, is_public):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    unique_id = str(uuid.uuid4())[:6]
    safe_author = "".join(c for c in author if c.isalnum())
    
    filename = f"{timestamp}_{safe_author}_{unique_id}{uploaded_file.name[-4:]}"
    
    target_dir = PUBLIC_DIR if is_public else (PRIVATE_DIR / safe_author)
    target_dir.mkdir(parents=True, exist_ok=True)
    
    with open(target_dir / filename, "wb") as f:
        f.write(uploaded_file.getbuffer())

def get_all_private_users():
    """Returns list of user folder names in the private directory."""
    if PRIVATE_DIR.exists():
        return [d.name for d in PRIVATE_DIR.iterdir() if d.is_dir()]
    return []

def get_files(mode, author=None):
    if mode == 'public':
        return sorted(list(PUBLIC_DIR.glob("*")), 
                      key=lambda f: f.stat().st_mtime, reverse=True)
    elif mode == 'private' and author:
        safe_author = "".join(c for c in author if c.isalnum())
        user_dir = PRIVATE_DIR / safe_author
        if user_dir.exists():
            return sorted(list(user_dir.glob("*")), 
                          key=lambda f: f.stat().st_mtime, reverse=True)
    return []
