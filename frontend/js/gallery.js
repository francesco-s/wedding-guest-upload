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
                ? `<video src="${f.url}" preload="metadata"></video>
                   <span class="video-badge">▶ Video</span>`
                : `<img src="${f.url}" loading="lazy" alt="${f.filename}">`}
            ${f.author ? `<div class="author-badge">📸 ${f.author}</div>` : ''}
        </div>
    `).join('');
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

// --- Swipe ---
(function initSwipe() {
    const lb = document.getElementById('lightbox');
    let startX = 0, startY = 0, isDragging = false;

    lb.addEventListener('touchstart', e => {
        if (e.target.closest('video')) return;
        startX     = e.touches[0].clientX;
        startY     = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });

    lb.addEventListener('touchmove', e => {
        if (!isDragging) return;
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > dy) e.preventDefault();
    }, { passive: false });

    lb.addEventListener('touchend', e => {
        if (!isDragging) return;
        isDragging = false;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 50) return;
        dx < 0
            ? document.getElementById('lb-next').click()
            : document.getElementById('lb-prev').click();
    }, { passive: true });
})();

// --- Pinch to zoom ---
(function initPinch() {
    const lbMedia = document.getElementById('lb-media');
    let scale     = 1;
    let lastScale = 1;
    let originX   = 0;
    let originY   = 0;
    let translateX = 0;
    let translateY = 0;

    let initialDistance = 0;
    let isPinching = false;

    function getDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    }

    function getMidpoint(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
        };
    }

    function applyTransform(el) {
        el.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        el.style.transformOrigin = 'center center';
        el.style.transition = 'none';
    }

    function resetTransform(el) {
        scale = 1; translateX = 0; translateY = 0;
        el.style.transform = '';
        el.style.transition = 'transform 0.2s';
    }

    lbMedia.addEventListener('touchstart', e => {
        if (e.touches.length === 2) {
            isPinching       = true;
            initialDistance  = getDistance(e.touches);
            lastScale        = scale;
            const mid        = getMidpoint(e.touches);
            originX          = mid.x;
            originY          = mid.y;
            e.preventDefault();
        }
    }, { passive: false });

    lbMedia.addEventListener('touchmove', e => {
        if (!isPinching || e.touches.length !== 2) return;
        e.preventDefault();

        const el       = lbMedia.querySelector('img, video');
        if (!el) return;

        const newScale = lastScale * (getDistance(e.touches) / initialDistance);
        scale          = Math.min(Math.max(newScale, 1), 4);   // clamp 1x – 4x

        applyTransform(el);
    }, { passive: false });

    lbMedia.addEventListener('touchend', e => {
        if (!isPinching) return;
        isPinching = false;

        const el = lbMedia.querySelector('img, video');
        if (!el) return;

        // Snap back to 1x if pinched below 1
        if (scale <= 1) resetTransform(el);
    }, { passive: true });

    // Double-tap to reset zoom
    let lastTap = 0;
    lbMedia.addEventListener('touchend', e => {
        if (e.touches.length > 0) return;
        const now = Date.now();
        if (now - lastTap < 300) {
            const el = lbMedia.querySelector('img, video');
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

