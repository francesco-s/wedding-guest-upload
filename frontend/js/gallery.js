Auth.requireAuth();
document.getElementById('username-display').textContent = Auth.username;

let currentFiles = [];
let currentIndex = 0;

loadGallery();

// --- File input ---
document.getElementById('fileInput').addEventListener('change', function () {
    const files = Array.from(this.files);
    const strip = document.getElementById('previewStrip');
    const btn   = document.getElementById('uploadBtn');

    strip.innerHTML = '';
    files.forEach(file => {
        const thumb = document.createElement('div');
        thumb.className = 'preview-thumb';
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            const url = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(url);
            img.src = url;
            thumb.appendChild(img);
        } else {
            thumb.textContent = '🎬';
        }
        strip.appendChild(thumb);
    });

    btn.disabled    = files.length === 0;
    btn.textContent = files.length > 0 ? `Carica ${files.length} file` : 'Carica';
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

// --- Load public gallery only ---
async function loadGallery() {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = `<div class="empty-state"><div class="icon">⏳</div><p>Caricamento...</p></div>`;

    const res   = await fetch('/api/media/public', { headers: Auth.authHeaders() });
    const files = await res.json();
    currentFiles = files;

    document.getElementById('gallery-count').textContent =
        `${files.length} ${files.length === 1 ? 'foto' : 'foto'}`;

    if (!files.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="icon">📷</div>
                <p>Nessuna foto ancora.<br>Sii il primo!</p>
            </div>`;
        return;
    }

    grid.innerHTML = files.map((f, i) => `
        <div class="gallery-item" onclick="openLightbox(${i})">
            ${f.is_video
                ? `<div class="video-placeholder">
                    <span class="video-play-icon">▶</span>
                </div>
                <span class="video-badge">▶ Video</span>`
                : `<img data-src="${f.thumb_url || f.url}" alt="${f.filename}" class="lazy">`}
            ${f.author ? `<div class="author-badge">📸 ${f.author}</div>` : ''}
        </div>
    `).join('');

    observeLazyImages(grid);
}

// --- Upload ---
async function uploadFiles() {
    const input     = document.getElementById('fileInput');
    const files     = input.files;
    if (!files.length) return;

    const isPrivate = document.getElementById('privateToggle').checked;
    const btn       = document.getElementById('uploadBtn');
    const fill      = document.getElementById('progressFill');

    btn.disabled = true;
    fill.style.width = '15%';

    const formData = new FormData();
    for (const f of files) formData.append('files', f);
    formData.append('is_private', isPrivate);

    try {
        fill.style.width = '60%';
        const res = await fetch('/api/media/upload', {
            method: 'POST',
            headers: Auth.authHeaders(),
            body: formData
        });
        fill.style.width = '100%';

        if (res.ok) {
            const label = isPrivate
                ? 'Foto inviate agli sposi!'
                : `${files.length} foto caricate!`;
            showToast(label);

            setTimeout(() => {
                fill.style.width = '0%';
                input.value = '';
                document.getElementById('previewStrip').innerHTML = '';
                btn.textContent = 'Carica';
                btn.disabled = true;
                document.getElementById('privateToggle').checked = false;
                // Reload public gallery (private uploads won't appear here)
                if (!isPrivate) loadGallery();
            }, 600);
        } else {
            showToast('Errore durante il caricamento.');
            fill.style.width = '0%';
        }
    } catch (e) {
        showToast('Errore di connessione.');
        fill.style.width = '0%';
    } finally {
        btn.disabled = false;
    }
}

// --- Lightbox ---
function openLightbox(index) {
    currentIndex = index;
    renderLightbox();
    document.getElementById('lightbox').classList.add('active');
    // Add lightbox state to history so that back button can close it
    history.pushState({ lightbox: true }, '');
}

function closeLightbox() {
    const video = document.querySelector('#lb-media video');
    if (video) { video.pause(); video.currentTime = 0; }
    if (document.fullscreenElement) document.exitFullscreen();
    document.getElementById('lightbox').classList.remove('active');
    // Remove lightbox state from history
    if (history.state?.lightbox) history.back();
}

function navLightbox(dir) {
    currentIndex = (currentIndex + dir + currentFiles.length) % currentFiles.length;
    renderLightbox();
}

function renderLightbox() {
    if (window._resetLightboxZoom) window._resetLightboxZoom();
    const f = currentFiles[currentIndex];
    document.getElementById('lb-media').innerHTML = f.is_video
        ? `<video src="${f.url}" controls autoplay style="max-width:92vw;max-height:86vh;"></video>`
        : `<img src="${f.url}" style="max-width:92vw;max-height:86vh;object-fit:contain;border-radius:4px;">`;

    document.getElementById('lb-counter').textContent =
        `${currentIndex + 1} / ${currentFiles.length}`;
    document.getElementById('lb-author').textContent =
        f.author ? `Autore: ${f.author}` : '';

    const dl = document.getElementById('lb-download');
    dl.href     = f.url;
    dl.download = f.filename;

    document.getElementById('lb-prev').disabled = currentIndex === 0;
    document.getElementById('lb-next').disabled = currentIndex === currentFiles.length - 1;
}

function toggleFullscreen() {
    const lb = document.getElementById('lightbox');
    if (!document.fullscreenElement) lb.requestFullscreen();
    else document.exitFullscreen();
}

// --- Toast ---
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// --- Keyboard ---
document.addEventListener('keydown', e => {
    if (!document.getElementById('lightbox').classList.contains('active')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
});

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

// -- History navigation for lightbox ---
window.addEventListener('popstate', e => {
    if (document.getElementById('lightbox').classList.contains('active')) {
        const video = document.querySelector('#lb-media video');
        if (video) { video.pause(); video.currentTime = 0; }
        if (document.fullscreenElement) document.exitFullscreen();
        document.getElementById('lightbox').classList.remove('active');
    }
});

