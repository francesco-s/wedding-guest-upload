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

// -- History navigation for lightbox ---
window.addEventListener('popstate', e => {
    if (document.getElementById('lightbox').classList.contains('active')) {
        const video = document.querySelector('#lb-media video');
        if (video) { video.pause(); video.currentTime = 0; }
        if (document.fullscreenElement) document.exitFullscreen();
        document.getElementById('lightbox').classList.remove('active');
    }
});

