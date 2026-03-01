# Deploy Guide — Hetzner VPS

Production deployment on a **Hetzner CX22** (~€4/month) using Nginx as reverse proxy and systemd to manage the app process.

---

## Prerequisites

- A [Hetzner Cloud](https://www.hetzner.com/cloud) account
- A domain name (e.g. from [Porkbun](https://porkbun.com))
- Your project pushed to a Git repository

---

## 1. Create the Server

1. Go to **Hetzner Cloud Console → Projects → Add Server**
2. **Location**: Falkenstein or Helsinki (closest to your country)
3. **OS**: Ubuntu 24.04
4. **Type**: CX22 (2 vCPU, 4 GB RAM, 40 GB SSD)
5. **SSH Key**: add your public key (`~/.ssh/id_ed25519.pub`)
   ```bash
   # Generate one locally if needed
   ssh-keygen -t ed25519 -C "wedding-deploy"
   cat ~/.ssh/id_ed25519.pub   # paste this into Hetzner
   ```
6. Click **Create & Buy**

---

## 2. First Access and User Setup

```bash
ssh root@<IP_SERVER>

apt update && apt upgrade -y

adduser wedding
usermod -aG sudo wedding
rsync --archive --chown=wedding:wedding ~/.ssh /home/wedding

su - wedding
```

---

## 3. Install Dependencies

```bash
sudo apt install -y nginx certbot python3-certbot-nginx git

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env
```

---

## 4. Deploy the Code

```bash
cd /opt
sudo mkdir wedding && sudo chown wedding:wedding wedding
git clone <your-repo> wedding
cd wedding

uv sync --frozen

mkdir -p data/uploads/public data/uploads/private
```

---

## 5. Systemd Service

```bash
sudo nano /etc/systemd/system/wedding.service
```

```ini
[Unit]
Description=Wedding Gallery
After=network.target

[Service]
User=wedding
WorkingDirectory=/opt/wedding
ExecStart=/opt/wedding/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wedding
sudo systemctl status wedding
```

---

## 6. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/wedding
```

```nginx
server {
    listen 80;
    server_name yoursite.example;

    client_max_body_size 200M;

    location / {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }
}
```

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/wedding /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. Domain DNS (Porkbun)

In **Porkbun → Domain Management → yoursite.example → DNS**:

1. Delete the default `ALIAS` and `CNAME` records pointing to `pixie.porkbun.com`
2. Add:

| Type | Host | Answer | TTL |
|------|------|--------|-----|
| A | `@` | `<IP_SERVER>` | 300 |

Wait 5–10 minutes for propagation, then verify:

```bash
ping yoursite.example
# should respond with your server IP
```

---

## 8. HTTPS with Let's Encrypt

```bash
sudo certbot --nginx -d yoursite.example
```

Follow the wizard — choose to redirect HTTP → HTTPS when prompted.
Certbot automatically renews the certificate every 90 days.

---

## 9. Verify

```bash
# App responding?
curl http://127.0.0.1:8000

# Nginx logs
sudo journalctl -u nginx -n 30

# App logs (live)
sudo journalctl -u wedding -f
```

Open **https://yoursite.example** in your browser — you should see the app with padlock.

---

## 10. Future Updates

```bash
cd /opt/wedding
git pull
uv sync --frozen
sudo systemctl restart wedding
```

---

## 11. Extra Storage (before the event)

If 40 GB is not enough for photos and videos, add a **Hetzner Volume**:

1. **Hetzner Console → Volumes → Create Volume**
2. Size: 100 GB (~€4.90/month)
3. Same datacenter as the server → Attach

```bash
# Format (first time only — get the ID from Hetzner Console)
sudo mkfs.ext4 -F /dev/disk/by-id/scsi-0HC_Volume_XXXXXXXX

# Mount
sudo mkdir -p /mnt/storage
sudo mount /dev/disk/by-id/scsi-0HC_Volume_XXXXXXXX /mnt/storage

# Auto-mount on reboot
echo "/dev/disk/by-id/scsi-0HC_Volume_XXXXXXXX /mnt/storage ext4 discard,nofail,defaults 0 0" | sudo tee -a /etc/fstab

# Move app data to the volume
sudo mv /opt/wedding/data /mnt/storage/data
sudo ln -s /mnt/storage/data /opt/wedding/data
sudo chown -R wedding:wedding /mnt/storage/data
sudo systemctl restart wedding
```

---

## 12. Backups (optional but recommended)

Enable **Hetzner Snapshots** from the console:
**Servers → your server → Backups → Enable**

Cost: ~20% of server price (~€0.80/month). Takes a full disk snapshot you can restore at any time.

