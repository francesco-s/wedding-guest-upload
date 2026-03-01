# Wedding Guest Book

A mobile-friendly web application for wedding guests to upload and share photos and videos.
Built with FastAPI (backend) and plain HTML/CSS/JS (frontend).

---

## Features

### For Guests
- **Name-only login**: Access instantly with just your name — no password required
- **Photo/Video Upload**: Multi-file upload with drag-and-drop support and thumbnail preview
- **Privacy Controls**: Toggle "Private" to send uploads directly to the couple, hidden from other guests
- **Built-in Gallery**: Responsive grid with fullscreen lightbox, keyboard/swipe navigation, and download support

### For Administrators
- **Admin Dashboard**: Secure access (username + password) to all content
- **Public Gallery**: See all public photos with author attribution
- **Private Folders**: Browse private uploads grouped by user with file counts
- **User Management**: List all registered users, view per-user file counts, delete users and their files
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
│       ├── auth_router.py   # POST /api/auth/login, /api/auth/admin-login
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
│   └── uploads/
│       ├── public/          # Public photos (per user subfolder)
│       └── private/         # Private folders per user
├── streamlit_legacy/        # Archived Streamlit version
├── pyproject.toml
└── README.md
```

---

## Usage

### Guests

1. Open the app URL or scan the QR code at the venue
2. Enter your name — no password needed
3. Upload photos or videos — toggle "Condividi solo con gli sposi" to send them privately to the couple
4. Browse the public gallery and tap any photo to open the fullscreen viewer
5. Navigate with arrow keys, on-screen buttons, or swipe gestures on mobile

### Admin

1. Login with username `admin` and the admin password
   - Change this before going to production (see Security section)
2. View all public photos with author names
3. Open any user's private folder to browse their uploads
4. Manage users from the Users tab: view file counts and delete accounts

---

## API Reference

The full interactive API documentation is available at:

```
http://localhost:8000/docs
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Guest login (name only) |
| POST | `/api/auth/admin-login` | Admin login (name + password) |
| GET | `/api/media/public` | List public files |
| GET | `/api/media/private` | List own private files |
| POST | `/api/media/upload` | Upload files |
| GET | `/api/admin/public` | Admin: all public files |
| GET | `/api/admin/users` | Admin: list users with file counts |
| GET | `/api/admin/private/{user}` | Admin: user's private files |
| DELETE | `/api/admin/users/{username}` | Admin: delete user and all their files |

---

## Security

- Admin password is hashed with SHA-256 before storage
- Guest login requires name only — no password stored
- Authentication uses JWT tokens (24h expiry)
- `admin` username is blocked on the guest login endpoint
- Private folders are isolated per user on disk: `data/uploads/private/Username/`
- Files are saved with UUID-based names to prevent overwrites and path traversal

### Production checklist
- [ ] Change admin password in `backend/auth.py`
- [ ] Replace `SECRET_KEY` in `backend/auth.py` with a strong random value
- [ ] HTTPS enabled via Nginx + Let's Encrypt (Certbot)
- [ ] Set up automated backups for `data/`
- [ ] Add a Hetzner Volume for extra storage before the event

---

## Deployment (Hetzner VPS — recommended)

The recommended production setup uses a **Hetzner CX22** (~€4/month) with Nginx as a reverse proxy.

See the full step-by-step deploy guide in [`DEPLOY.md`](./DEPLOY.md).

### Docker

```dockerfile
FROM python:3.11-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-cache

COPY . .
EXPOSE 8000
CMD [".venv/bin/uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t wedding-app .
docker run -p 8000:8000 -v $(pwd)/data:/app/data wedding-app
```

The `-v` flag is required to persist photos across container restarts.

---

## Configuration

Edit `backend/config.py` to customize the app:

```python
APP_TITLE = "Libro degli Ospiti"
APP_ICON = "💍"
SECRET_KEY = "change-this-in-production"
TOKEN_EXPIRE_MINUTES = 60 * 24
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.mp4', '.mov'}
```

To change the admin password, edit `backend/auth.py`:

```python
admin_hash = hashlib.sha256("your-new-password".encode()).hexdigest()
```

---

## QR Code

Generate a QR code at [qrcode-monkey.com](https://www.qrcode-monkey.com) pointing to your domain and print it on table cards for the venue.