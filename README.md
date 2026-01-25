# 💍 Wedding Guest Book

A production-ready, mobile-friendly web application for wedding guests to upload and share photos/videos. Features secure authentication, and public/private galleries.

---

## ✨ Features

### For Guests
- **🔐 Auto-Registration**: First-time visitors create their account instantly with name + password
- **📸 Photo/Video Upload**: Multi-file upload with drag-and-drop support
- **🔒 Privacy Controls**: Choose "Public" (visible to all) or "Private" (only you & couple)
- **🖼️ Built-in Gallery**: Images are displayed in an integrated gallery with:
  - ⬅️ ➡️ Keyboard/button navigation
  - 📥 Download button
  - ⛶ Native fullscreen mode
  - Author attribution on public photos
- **📱 Mobile-First Design**: Responsive 3-column grid, touch-friendly controls

### For Administrators
- **🕵️ Admin Dashboard**: Secure access to all content
- **🌍 Public Gallery View**: See all public photos with author names
- **🔒 Private Folders**: Browse private uploads grouped by user
- **🎯 4-Column Grid**: Efficient overview for larger screens
- **📊 Photo Statistics**: File counts per user/category

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- [uv](https://github.com/astral-sh/uv)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/wedding-guest-book.git
cd wedding-guest-book

# Using uv
uv sync
uv run streamlit run app.py
```

The app will open at `http://localhost:8501`

---

## 📂 Project Structure

```
wedding_app_project/
├── app.py                    # Entry point (routing)
├── config.py                 # Configuration settings
├── auth.py                   # User authentication & DB
├── components/
│   ├── __init__.py
│   └── lightbox.py          # Reusable lightbox component
├── views/
│   ├── __init__.py
│   ├── admin_view.py        # Admin dashboard
│   └── guest_view.py        # Guest interface
├── utils/
│   ├── __init__.py
│   └── file_ops.py          # File operations
├── data/                     # Auto-created on first run
│   ├── guests.db            # SQLite user database
│   └── uploads/
│       ├── public/          # Public photos
│       └── private/         # Private folders per user
├── pyproject.toml           # Project dependencies
└── README.md
```

---

## 🎯 Usage Guide

### For Wedding Guests

1. **First Visit**:
   - Open the app URL or scan the QR code
   - Enter your name (e.g., "Mario")
   - Choose a password
   - Click "Entra nell'App" (Enter App)

2. **Upload Photos**:
   - Click "📸 Carica Foto / Video"
   - Select one or multiple files
   - Toggle "🔒 Mantieni Privato" if you want photos private
   - Click "Carica" (Upload)

3. **View Gallery**:
   - Switch between "Momenti Pubblici" (Public) and "Il Mio Album Privato" (Private)
   - Click any photo to open fullscreen viewer
   - Navigate with arrow keys or on-screen buttons
   - Download photos with the 📥 button

### For Administrators

1. **Login**:
   - Username: `admin`
   - Password: `admin123` ⚠️ **Change this in production!**

2. **View Public Gallery**:
   - See all public photos with author names
   - Use lightbox for fullscreen viewing

3. **Inspect Private Folders**:
   - Expand any user's folder
   - Browse their private uploads
   - Download or view fullscreen

---

## 🔒 Security

### Authentication
- Passwords are hashed using **SHA-256** before storage
- SQLite database stores only hashed credentials
- Session-based authentication via Streamlit's `session_state`

### File Storage
- Files are saved with UUID-based names to prevent overwrites
- Author name is embedded in filename: `YYYYMMDD_HHMM_Author_UUID.ext`
- Private folders are isolated per user: `data/uploads/private/Username/`

### Production Checklist
- [ ] Change admin password in `auth.py`
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up automated backups for `data/` folder

---

## 🐳 Deployment

### Option 1: Docker (Recommended)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY . .

RUN pip install streamlit

EXPOSE 8501

CMD ["streamlit", "run", "app.py", "--server.address", "0.0.0.0"]
```

```bash
docker build -t wedding-app .
docker run -p 8501:8501 -v $(pwd)/data:/app/data wedding-app
```

### Option 2: Streamlit Cloud

1. Push code to GitHub
2. Connect to [Streamlit Cloud](https://streamlit.io/cloud)
3. **Important**: Add persistent volume for `data/` folder (use external database in production)

### Option 3: VPS (DigitalOcean, Hetzner, etc.)

```bash
# On server
git clone <your-repo>
cd wedding-guest-book
pip install streamlit
nohup streamlit run app.py --server.port 8501 &
```

⚠️ **Storage Warning**: Streamlit Cloud's free tier does NOT persist files. For production, use:
- AWS S3 for uploads
- PostgreSQL for user database

---

## 🛠️ Configuration

Edit `config.py` to customize:

```python
APP_TITLE = "Wedding Guest Book"  # Change app name
APP_ICON = "💍"                   # Change emoji
ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.mov']
```

---

## 📱 QR Code Generation

To share the app at your wedding, generate a QR code:

```python
import qrcode

# Your app URL (local network or public)
url = "http://192.168.1.100:8501"  # Replace with your IP/domain

qr = qrcode.make(url)
qr.save("wedding_qr.png")
```

Print and display at the reception!

---

## 💡 Future Enhancements

- [ ] Video thumbnails in gallery
- [ ] Bulk download (ZIP all photos)
- [ ] Email notifications when guests upload
- [ ] Integration with cloud storage (S3, Google Drive)
- [ ] Multi-language support (currently Italian UI)
- [ ] Advanced filtering (by date, author, tags)
- [ ] Wedding slideshow mode

