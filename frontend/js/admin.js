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
                ? `<video src="${f.url}" muted preload="metadata"></video>
                   <span class="video-badge">▶</span>`
                : `<img src="${f.url}" alt="${f.filename}" loading="lazy">`}
            ${f.author
                ? `<div class="author-badge">${f.author}</div>`
                : ''}
        </div>
    `).join('');
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

        container.innerHTML = usersWithPrivate.map(u => `
            <div class="user-folder">
                <div class="user-folder-header" onclick="toggleFolder(this, '${u.username}')">
                    <div class="folder-info">
                        <span>📁</span>
                        <span>${u.username}</span>
                        <span class="file-count">${u.private_count} file</span>
                    </div>
                    <span class="chevron">▼</span>
                </div>
                <div class="user-folder-body" id="folder-${u.username}"></div>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = `<div class="empty-state"><p>Errore caricamento.</p></div>`;
    }
}

// ── Toggle folder open/close ──────────────────────────────────────────────────

async function toggleFolder(headerEl, username) {
    const body = document.getElementById(`folder-${username}`);
    const isOpen = body.classList.contains('open');

    headerEl.classList.toggle('open', !isOpen);
    body.classList.toggle('open', !isOpen);

    // Load files only on first open
    if (!isOpen && !body.dataset.loaded) {
        body.innerHTML = `<div class="empty-folder">Caricamento...</div>`;

        try {
            const res   = await fetch(`/api/admin/private/${username}`, { headers: Auth.headers() });
            const files = await res.json();

            body.dataset.loaded = '1';

            const gridEl = document.createElement('div');
            gridEl.className = 'admin-grid';
            body.innerHTML = '';
            body.appendChild(gridEl);

            renderGrid(files, gridEl, `private_${username}`);
        } catch (e) {
            body.innerHTML = `<div class="empty-folder">Errore caricamento.</div>`;
        }
    }
}

// --- Swipe & Pinch to Zoom ---
(function initTouch() {
    const lb = document.getElementById('lightbox');
    
    // Swipe vars
    let startX = 0, startY = 0, isDragging = false;
    
    // Zoom vars
    let currentScale = 1;
    let initialDist = 0;
    let isZooming = false;
    
    function getDistance(touches) {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    }

    lb.addEventListener('touchstart', e => {
        if (e.target.closest('video')) return; // ignore native video controls
        
        if (e.touches.length === 2) {
            // Start pinch to zoom
            isZooming = true;
            isDragging = false;
            initialDist = getDistance(e.touches);
            e.preventDefault();
        } else if (e.touches.length === 1 && currentScale === 1) {
            // Start normal swipe (only if not zoomed in)
            isZooming = false;
            isDragging = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
    }, { passive: false }); // Needs false to prevent default on zoom

    lb.addEventListener('touchmove', e => {
        if (e.target.closest('video')) return;

        if (isZooming && e.touches.length === 2) {
            e.preventDefault(); // Stop page scroll
            const img = document.querySelector('#lb-media img');
            if (!img) return;

            const newDist = getDistance(e.touches);
            // Calculate scale factor (distance ratio)
            const scaleFactor = newDist / initialDist;
            
            // Limit zoom between 1x and 4x
            const newScale = Math.min(Math.max(1, currentScale * scaleFactor), 4);
            img.style.transform = `scale(${newScale})`;
            img.style.transition = 'none'; // instant follow finger
            
            // Note: we don't update currentScale here so it calculates relative to start
        } 
        else if (isDragging && currentScale === 1) {
            const dx = Math.abs(e.touches[0].clientX - startX);
            const dy = Math.abs(e.touches[0].clientY - startY);
            if (dx > dy) e.preventDefault(); // prevent vertical scroll on horizontal swipe
        }
    }, { passive: false });

    lb.addEventListener('touchend', e => {
        const img = document.querySelector('#lb-media img');
        
        if (isZooming && e.touches.length < 2) {
            // Ended zoom
            isZooming = false;
            if (img) {
                // Read exact applied scale to save it
                const match = img.style.transform.match(/scale\(([^)]+)\)/);
                if (match) currentScale = parseFloat(match[1]);
                
                // Snap back to 1 if too small, or reset transition
                img.style.transition = 'transform 0.2s ease';
                if (currentScale < 1.05) {
                    currentScale = 1;
                    img.style.transform = `scale(1)`;
                }
            }
            return;
        }

        if (isDragging && currentScale === 1) {
            isDragging = false;
            if (!e.changedTouches.length) return;
            
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;

            if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 50) return;
            
            dx < 0
                ? document.getElementById('lb-next').click()
                : document.getElementById('lb-prev').click();
        }
    }, { passive: true });

    // Reset zoom when navigating slides or closing
    function resetZoom() {
        currentScale = 1;
        isZooming = false;
        isDragging = false;
        const img = document.querySelector('#lb-media img');
        if (img) {
            img.style.transform = `scale(1)`;
            img.style.transition = 'transform 0.2s ease';
        }
    }

    // Attach to existing buttons
    document.getElementById('lb-next').addEventListener('click', resetZoom);
    document.getElementById('lb-prev').addEventListener('click', resetZoom);
    document.querySelector('.lb-close').addEventListener('click', resetZoom);
})();

// --- Double Tap to Zoom ---
(function initDoubleTap() {
    const lbMedia = document.getElementById('lb-media');
    let lastTap = 0;

    lbMedia.addEventListener('touchend', e => {
        const img = e.target.closest('img');
        if (!img) return; // Only apply to images

        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;

        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault(); // Prevent standard double-tap scroll
            
            // Toggle zoom
            const isZoomed = img.style.transform.includes('scale(2)');
            img.style.transition = 'transform 0.3s ease';
            img.style.transform = isZoomed ? 'scale(1)' : 'scale(2)';
            img.style.transformOrigin = 'center center';
            
        }
        lastTap = currentTime;
    }, { passive: false });
})();


// ── Init ──────────────────────────────────────────────────────────────────────

loadStats();
loadPublicGallery();
loadPrivateFolders();