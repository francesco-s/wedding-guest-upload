Auth.requireAuth();
document.getElementById('username-display').textContent = Auth.username;

let currentFiles = [];
let currentIndex = 0;
let currentMode = 'public';

loadGallery('public');

// --- File input change handler ---
document.getElementById('fileInput').addEventListener('change', function () {
    const files = Array.from(this.files);
    const strip = document.getElementById('previewStrip');
    const btn = document.getElementById('uploadBtn');

    strip.innerHTML = '';

    files.forEach(file => {
        const thumb = document.createElement('div');
        thumb.className = 'preview-thumb';

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            thumb.appendChild(img);
        } else {
            thumb.textContent = '🎬';
        }

        strip.appendChild(thumb);
    });

    btn.disabled = files.length === 0;
    btn.textContent = files.length > 0 ? `Carica ${files.length} file` : 'Carica';
});

// --- Tab switch ---
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById('gallery-label').textContent =
        tab === 'public' ? 'Momenti pubblici' : 'Il mio album privato';
    loadGallery(tab);
}

// --- Load gallery ---
async function loadGallery(mode) {
    currentMode = mode;
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = `<div class="empty-state"><div class="icon">⏳</div><p>Caricamento...</p></div>`;

    const res = await fetch(`/api/media/${mode}`, { headers: Auth.authHeaders() });
    const files = await res.json();
    currentFiles = files;

    document.getElementById('gallery-count').textContent =
        `${files.length} ${files.length === 1 ? 'foto' : 'foto'}`;

    if (!files.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="icon">${mode === 'public' ? '📷' : '🔒'}</div>
                <p>${mode === 'public' ? 'Nessuna foto pubblica ancora.<br>Sii il primo!' : 'Nessuna foto privata.<br>Carica qualcosa!'}</p>
            </div>`;
        return;
    }

    grid.innerHTML = files.map((f, i) => `
        <div class="gallery-item" onclick="openLightbox(${i})">
            ${f.is_video
                ? `<video src="${f.url}" preload="metadata"></video>
                   <span class="video-badge">▶ Video</span>`
                : `<img src="${f.url}" loading="lazy" alt="${f.filename}">`
            }
            ${f.author ? `<div class="author-badge">📸 ${f.author}</div>` : ''}
        </div>
    `).join('');
}

// --- Upload ---
async function uploadFiles() {
    const input = document.getElementById('fileInput');
    const files = input.files;
    if (!files.length) return;

    const isPrivate = document.getElementById('privateToggle').checked;
    const btn = document.getElementById('uploadBtn');
    const fill = document.getElementById('progressFill');

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
            showToast(`✅ ${files.length} file caricati!`);
            // Reset UI
            setTimeout(() => {
                fill.style.width = '0%';
                input.value = '';
                document.getElementById('previewStrip').innerHTML = '';
                btn.textContent = 'Carica';
                btn.disabled = true;
                const newMode = isPrivate ? 'private' : 'public';
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.getElementById(`tab-${newMode}`).classList.add('active');
                document.getElementById('gallery-label').textContent =
                    newMode === 'public' ? 'Momenti pubblici' : 'Il mio album privato';
                loadGallery(newMode);
            }, 600);
        } else {
            showToast('❌ Errore durante il caricamento.');
            fill.style.width = '0%';
        }
    } catch (e) {
        showToast('❌ Errore di connessione.');
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
}

function closeLightbox() {
    // Stop any playing video before closing
    const video = document.querySelector('#lb-media video');
    if (video) {
        video.pause();
        video.currentTime = 0;
    }
    if (document.fullscreenElement) document.exitFullscreen();
    document.getElementById('lightbox').classList.remove('active');
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

    document.getElementById('lb-counter').textContent = `${currentIndex + 1} / ${currentFiles.length}`;
    document.getElementById('lb-author').textContent = f.author ? `📸 ${f.author}` : '';
    const dl = document.getElementById('lb-download');
    dl.href = f.url;
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

// Keyboard nav
document.addEventListener('keydown', e => {
    if (!document.getElementById('lightbox').classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
});
