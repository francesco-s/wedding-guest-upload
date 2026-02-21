from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .config import FRONTEND_DIR, UPLOAD_DIR
from .auth import init_db
from .routers import auth_router, media_router, admin_router

app = FastAPI(title="Wedding Guest Book API")

# Init DB on startup
@app.on_event("startup")
def startup():
    init_db()

# Include routers
app.include_router(auth_router.router)
app.include_router(media_router.router)
app.include_router(admin_router.router)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Serve Frontend static files
app.mount("/static", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")

# SPA-style routing: serve HTML pages
@app.get("/")
def serve_index():
    return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/gallery")
def serve_gallery():
    return FileResponse(FRONTEND_DIR / "gallery.html")

@app.get("/admin")
def serve_admin():
    return FileResponse(FRONTEND_DIR / "admin.html")
