# Wedding Guest Book

A mobile-friendly web application for wedding guests to upload and share photos and videos.
Built with FastAPI (backend) and plain HTML/CSS/JS (frontend).

---

## Features

### For Guests
- **Auto-Registration**: First-time visitors create an account instantly with name + password
- **Photo/Video Upload**: Multi-file upload with drag-and-drop support and thumbnail preview
- **Privacy Controls**: Each upload can be set as public (visible to all) or private (only the user and admin)
- **Built-in Gallery**: Responsive grid with fullscreen lightbox, keyboard navigation, and download support

### For Administrators
- **Admin Dashboard**: Secure access to all content
- **Public Gallery**: See all public photos with author attribution
- **Private Folders**: Browse private uploads grouped by user with file counts
- **Statistics**: Total public photos, registered users, and private uploads at a glance

---

## Quick Start

### Prerequisites
- Python 3.11+
- [uv](https://github.com/astral-sh/uv)

### Run locally

```bash
uv sync
uv run uvicorn backend.main:app --reload --port 8000
```

Open `http://localhost:8000` in your browser.

---

## Project Structure

```
wedding-guest-book/
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Paths, settings, constants
│   ├── auth.py              # Authentication + JWT
│   └── routers/
│       ├── __init__.py
│       ├── auth_router.py   # POST /api/auth/login
│       ├── media_router.py  # GET/POST /api/media
│       └── admin_router.py  # GET /api/admin/*
├── frontend/
│   ├── index.html           # Login page
│   ├── gallery.html         # Guest interface
│   ├── admin.html           # Admin dashboard
│   ├── css/
│   │   ├── style.css        # All shared styles
│   │   └── bg.jpg           # Background image
│   └── js/
│       ├── auth.js          # Shared auth utilities
│       ├── gallery.js       # Guest gallery logic
│       └── admin.js         # Admin dashboard logic
├── data/                    # Auto-created on first run
│   ├── guests.db            # SQLite user database
│   └── uploads/
│       ├── public/          # Public photos
│       └── private/         # Private folders per user
├── streamlit_legacy/        # Archived Streamlit version
├── pyproject.toml
└── README.md
```

---

## Usage

### Guests

1. Open the app URL or scan the QR code at the venue
2. Enter your name and choose a password (account is created automatically)
3. Upload photos or videos — toggle "Private" to keep them visible only to you and the admin
4. Browse the public gallery or your private album
5. Click any photo to open the fullscreen viewer; use arrow keys or buttons to navigate

### Admin

1. Login with username `admin` and password `admin123`
   - Change this before going to production (see Security section)
2. View all public photos with author names
3. Open any user's private folder to browse their uploads

---

## API Reference

The full interactive API documentation is available at:

```
http://localhost:8000/docs
```

Main endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login or register |
| GET | `/api/media/public` | List public files |
| GET | `/api/media/private` | List own private files |
| POST | `/api/media/upload` | Upload files |
| GET | `/api/admin/public` | Admin: all public files |
| GET | `/api/admin/users` | Admin: list users |
| GET | `/api/admin/private/{user}` | Admin: user's private files |

---

## Security

- Passwords are hashed with SHA-256 before storage
- Authentication uses JWT tokens (24h expiry)
- Private folders are isolated per user on disk: `data/uploads/private/Username/`
- Files are saved with UUID-based names to prevent overwrites and path traversal

### Production checklist
- [ ] Change admin password in `backend/auth.py`
- [ ] Replace `SECRET_KEY` in `backend/auth.py` with a strong random value
- [ ] Enable HTTPS (via reverse proxy or platform)
- [ ] Set up automated backups for `data/`

---

## Deployment

### Render (free, ephemeral storage — good for testing)

Add a `render.yaml` to the root:

```yaml
services:
  - type: web
    name: wedding-guest-book
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
```

Push to GitHub and connect the repo on [render.com](https://render.com).

> Note: Render's free tier does not persist files between deploys. Uploaded photos will be lost on restart.

### Docker

```dockerfile
FROM python:3.11-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-cache

COPY . .
EXPOSE 8000
CMD [".venv/bin/uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t wedding-app .
docker run -p 8000:8000 -v $(pwd)/data:/app/data wedding-app
```

## Configuration

Edit `backend/config.py` to customize the app:

```python
APP_TITLE = "Libro degli Ospiti"
APP_ICON = "💍"
SECRET_KEY = "change-this-in-production"
TOKEN_EXPIRE_MINUTES = 60 * 24   # JWT token lifetime
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.mp4', '.mov'}
```

To change the admin credentials, edit the `init_db()` function in `backend/auth.py`:

```python
admin_hash = hashlib.sha256("your-new-password".encode()).hexdigest()
```

---

## QR Code

Generate a QR code to display at the venue:

```python
import qrcode

qr = qrcode.make("https://your-app-url.onrender.com")
qr.save("wedding_qr.png")
```

Install with: `pip install qrcode[pil]`

---

## Roadmap

- [ ] Bulk download as ZIP
- [ ] Video thumbnails
- [ ] Slideshow / kiosk mode
- [ ] Cloud storage backend (S3 / Cloudflare R2)
- [ ] Email notification on upload
