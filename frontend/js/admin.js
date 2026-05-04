Auth.requireAdmin();

// ── Lightbox ────────────────────────────────────────────────────────────────

const AdminGallery = {
    currentFiles: [],
    currentIndex: 0,
    fileStores: {},

    openFor(storeKey, index) {
        this.currentFiles = this.fileStores[storeKey];
        this.currentIndex = index;
        this.renderLightbox();
        document.getElementById('lightbox').classList.add('active');
        history.pushState({ lightbox: true }, '');
    },

    closeLightbox() {
        const video = document.querySelector('#lb-media video');
        if (video) { video.pause(); video.currentTime = 0; }
        if (document.fullscreenElement) document.exitFullscreen();
        document.getElementById('lightbox').classList.remove('active');
        if (history.state?.lightbox) history.back();
    },

    nav(dir) {
        const len = this.currentFiles.length;
        this.currentIndex = (this.currentIndex + dir + len) % len;
        this.renderLightbox();
    },

    renderLightbox() {
        if (window._resetLightboxZoom) window._resetLightboxZoom();
        const f = this.currentFiles[this.currentIndex];
        const mediaEl = document.getElementById('lb-media');

        if (f.is_video) {
            mediaEl.innerHTML = `<video src="${f.url}" controls autoplay></video>`;
        } else {
            mediaEl.innerHTML = `<img src="${f.url}" alt="${f.filename}">`;
        }

        document.getElementById('lb-counter').textContent =
            `${this.currentIndex + 1} / ${this.currentFiles.length}`;
        document.getElementById('lb-author').textContent =
            f.author ? `Autore: ${f.author}` : '';

        const dl = document.getElementById('lb-download');
        dl.href     = f.url;
        dl.download = f.filename;

        document.getElementById('lb-prev').disabled = this.currentIndex === 0;
        document.getElementById('lb-next').disabled =
            this.currentIndex === this.currentFiles.length - 1;
    },

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
};

// -- History handling for lightbox back button support --
window.addEventListener('popstate', e => {
    if (document.getElementById('lightbox').classList.contains('active')) {
        const video = document.querySelector('#lb-media video');
        if (video) { video.pause(); video.currentTime = 0; }
        if (document.fullscreenElement) document.exitFullscreen();
        document.getElementById('lightbox').classList.remove('active');
    }
});

// --- Keyboard navigation ---
document.addEventListener('keydown', e => {
    if (!document.getElementById('lightbox').classList.contains('active')) return;
    if (e.key === 'Escape')     AdminGallery.closeLightbox();
    if (e.key === 'ArrowLeft')  AdminGallery.nav(-1);
    if (e.key === 'ArrowRight') AdminGallery.nav(1);
});

// --- Lazy loader ---
function observeLazyImages(container) {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            obs.unobserve(img);
        });
    }, { rootMargin: '200px' });

    container.querySelectorAll('img.lazy').forEach(img => observer.observe(img));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Creates a safe DOM id from any string (removes spaces, quotes, etc)
function safeDomId(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

// ── Grid renderer ────────────────────────────────────────────────────────────

function renderGrid(files, gridEl, storeKey) {
    AdminGallery.fileStores[storeKey] = files;

    if (!files.length) {
        gridEl.innerHTML = `
            <div class="empty-folder">Nessun file.</div>`;
        return;
    }

    gridEl.innerHTML = files.map((f, i) => `
        <div class="gallery-item" onclick="AdminGallery.openFor('${storeKey}', ${i})">
            ${f.is_video
                ? `<div class="video-placeholder">
                    <span class="video-play-icon">▶</span>
                </div>
                <span class="video-badge">▶ Video</span>`
                : `<img data-src="${f.thumb_url || f.url}" alt="${f.filename}" class="lazy">`}
            ${f.author
                ? `<div class="author-badge">${f.author}</div>`
                : ''}
        </div>
    `).join('');

    observeLazyImages(gridEl);
}

// ── Stats ────────────────────────────────────────────────────────────────────

async function loadStats() {
    try {
        const res  = await fetch('/api/admin/stats', { headers: Auth.headers() });
        const data = await res.json();
        document.getElementById('stat-public').textContent  = data.public  ?? '—';
        document.getElementById('stat-users').textContent   = data.users   ?? '—';
        document.getElementById('stat-private').textContent = data.private ?? '—';
    } catch (e) {
        console.error('Stats error:', e);
    }
}

// ── Public gallery ────────────────────────────────────────────────────────────

async function loadPublicGallery() {
    const grid = document.getElementById('admin-public-grid');

    try {
        const res   = await fetch('/api/admin/public', { headers: Auth.headers() });
        const files = await res.json();

        document.getElementById('public-count').textContent = files.length;
        renderGrid(files, grid, 'public');
    } catch (e) {
        grid.innerHTML = `<div class="empty-state"><p>Errore caricamento.</p></div>`;
    }
}

// ── Private folders ───────────────────────────────────────────────────────────

async function loadPrivateFolders() {
    const container = document.getElementById('private-folders');

    try {
        // Returns: [{username, public_count, private_count, total}, ...]
        const res   = await fetch('/api/admin/users', { headers: Auth.headers() });
        const users = await res.json();

        // Only show users who have at least 1 private file
        const usersWithPrivate = users.filter(u => u.private_count > 0);

        document.getElementById('private-count').textContent = usersWithPrivate.length;

        if (!usersWithPrivate.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🔒</div>
                    <p>Nessuna cartella privata.</p>
                </div>`;
            return;
        }

        // We escape the string using single quotes and use safeDomId for the element ID
        container.innerHTML = usersWithPrivate.map(u => {
            const safeId = safeDomId(u.username);
            // Replace single quotes with escaped quotes so it doesn't break the onclick handler
            const escapedUsername = u.username.replace(/'/g, "\\'");
            return `
            <div class="user-folder">
                <div class="user-folder-header" onclick="toggleFolder(this, '${escapedUsername}', '${safeId}')">
                    <div class="folder-info">
                        <span>📁</span>
                        <span>${u.username}</span>
                        <span class="file-count">${u.private_count} file</span>
                    </div>
                    <span class="chevron">▼</span>
                </div>
                <div class="user-folder-body" id="folder-${safeId}"></div>
            </div>
        `}).join('');

    } catch (e) {
        container.innerHTML = `<div class="empty-state"><p>Errore caricamento.</p></div>`;
    }
}

// ── Toggle folder open/close ──────────────────────────────────────────────────

async function toggleFolder(headerEl, username, safeId) {
    const body = document.getElementById(`folder-${safeId}`);
    const isOpen = body.classList.contains('open');

    headerEl.classList.toggle('open', !isOpen);
    body.classList.toggle('open', !isOpen);

    // Load files only on first open
    if (!isOpen && !body.dataset.loaded) {
        body.innerHTML = `<div class="empty-folder">Caricamento...</div>`;

        try {
            // Send original username to API via encodeURIComponent
            const res   = await fetch(`/api/admin/private/${encodeURIComponent(username)}`, { headers: Auth.headers() });
            const files = await res.json();

            body.dataset.loaded = '1';

            const gridEl = document.createElement('div');
            gridEl.className = 'admin-grid';
            body.innerHTML = '';
            body.appendChild(gridEl);

            renderGrid(files, gridEl, `private_${safeId}`);
        } catch (e) {
            body.innerHTML = `<div class="empty-folder">Errore caricamento.</div>`;
        }
    }
}

(function initInteractions() {
    const lb      = document.getElementById('lightbox');
    const lbMedia = document.getElementById('lb-media');

    // ── State ──────────────────────────────────────────────────────────────
    let scale      = 1;
    let lastScale  = 1;
    let translateX = 0;
    let translateY = 0;

    let isPinching       = false;
    let initialDistance  = 0;

    // Pan state
    let isPanning  = false;
    let panStartX  = 0;
    let panStartY  = 0;
    let panOriginX = 0;
    let panOriginY = 0;

    // Swipe state (only when scale === 1)
    let swipeStartX = 0;
    let swipeStartY = 0;
    let isSwiping   = false;

    // ── Helpers ────────────────────────────────────────────────────────────
    function getDistance(touches) {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    }

    function applyTransform(el) {
        el.style.transition  = 'none';
        el.style.transform   = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        el.style.transformOrigin = 'center center';
    }

    function resetTransform(el) {
        scale = 1; translateX = 0; translateY = 0;
        el.style.transition = 'transform 0.25s ease';
        el.style.transform  = '';
    }

    function getMedia() {
        return lbMedia.querySelector('img, video');
    }

    // ── Reset on slide change ──────────────────────────────────────────────
    // Call this whenever a new slide is rendered
    window._resetLightboxZoom = () => {
        const el = getMedia();
        if (el) resetTransform(el);
    };

    // ── Touch Start ────────────────────────────────────────────────────────
    lb.addEventListener('touchstart', e => {
        if (e.touches.length === 2) {
            // Start pinch
            isPinching      = true;
            isSwiping       = false;
            isPanning        = false;
            initialDistance = getDistance(e.touches);
            lastScale       = scale;
            e.preventDefault();
        } else if (e.touches.length === 1) {
            const touch = e.touches[0];
            if (e.target.closest('video')) return;

            if (scale > 1) {
                // Start pan
                isPanning  = true;
                isSwiping  = false;
                panStartX  = touch.clientX;
                panStartY  = touch.clientY;
                panOriginX = translateX;
                panOriginY = translateY;
            } else {
                // Start swipe
                isSwiping   = true;
                isPanning   = false;
                swipeStartX = touch.clientX;
                swipeStartY = touch.clientY;
            }
        }
    }, { passive: false });

    // ── Touch Move ─────────────────────────────────────────────────────────
    lb.addEventListener('touchmove', e => {
        if (isPinching && e.touches.length === 2) {
            e.preventDefault();
            const el = getMedia();
            if (!el) return;
            const newScale = lastScale * (getDistance(e.touches) / initialDistance);
            scale = Math.min(Math.max(newScale, 1), 4);
            applyTransform(el);

        } else if (isPanning && e.touches.length === 1) {
            e.preventDefault();
            const el = getMedia();
            if (!el) return;
            translateX = panOriginX + (e.touches[0].clientX - panStartX);
            translateY = panOriginY + (e.touches[0].clientY - panStartY);
            applyTransform(el);

        } else if (isSwiping && e.touches.length === 1) {
            const dx = Math.abs(e.touches[0].clientX - swipeStartX);
            const dy = Math.abs(e.touches[0].clientY - swipeStartY);
            if (dx > dy) e.preventDefault();
        }
    }, { passive: false });

    // ── Touch End ──────────────────────────────────────────────────────────
    lb.addEventListener('touchend', e => {
        if (isPinching) {
            isPinching = false;
            const el = getMedia();
            if (el && scale <= 1) resetTransform(el);
        }

        if (isPanning) {
            isPanning = false;
        }

        if (isSwiping && e.changedTouches.length === 1) {
            isSwiping = false;
            const dx = e.changedTouches[0].clientX - swipeStartX;
            const dy = e.changedTouches[0].clientY - swipeStartY;
            if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 50) return;
            dx < 0
                ? document.getElementById('lb-next').click()
                : document.getElementById('lb-prev').click();
        }
    }, { passive: true });

    // ── Double tap to reset ────────────────────────────────────────────────
    let lastTap = 0;
    lb.addEventListener('touchend', e => {
        if (e.touches.length > 0) return;
        const now = Date.now();
        if (now - lastTap < 300) {
            const el = getMedia();
            if (el) resetTransform(el);
        }
        lastTap = now;
    }, { passive: true });
})();

// ── Init ──────────────────────────────────────────────────────────────────────

loadStats();
loadPublicGallery();
loadPrivateFolders();
