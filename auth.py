import sqlite3
import hashlib
from config import DB_FILE

def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        # Create table with is_admin column
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password_hash TEXT,
                is_admin INTEGER DEFAULT 0
            )
        """)
        
        # Ensure default admin exists (CHANGE THIS PASSWORD IN PRODUCTION)
        admin_hash = hashlib.sha256("admin123".encode()).hexdigest()
        try:
            conn.execute("INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)", 
                         ("admin", admin_hash))
        except sqlite3.IntegrityError:
            pass  # Admin already exists

def login_or_register(username, password):
    """
    Returns: ('success', msg, is_admin_bool) or ('error', msg, False)
    """
    p_hash = hashlib.sha256(password.encode()).hexdigest()
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash, is_admin FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        
        if row:  # Login
            stored_hash, is_admin = row
            if stored_hash == p_hash:
                return 'success', f"Bentornato {username}", bool(is_admin)
            return 'error', "Password errata.", False
        else:  # Register (New users are never admin)
            cursor.execute("INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 0)", 
                           (username, p_hash))
            return 'success', f"Account creato!", False
