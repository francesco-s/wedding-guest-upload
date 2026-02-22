// Guard: only admins can access this page
Auth.requireAdmin();

// --- State ---
const AdminGallery = {
    currentFiles: [],
    currentIndex: 0,
    fileStores: {}, // Stores files per grid section

    // Open lightbox for a specific grid
    openFor(storeKey, index) {
        this.currentFiles = this.fileStores[storeKey];
        this.currentIndex = index;
        this.renderLightbox();
        document.getElementById('lightbox').classList.add('active');
    },

    closeLightbox() {
        // Stop any playing video before closing
        const video = document.querySelector('#lb-media video');
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
        if (document.fullscreenElement) document.exitFullscreen();
        document.getElementById('lightbox').classList.remove('active');
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
            mediaEl.innerHTML = `<video src="${f.url}" controls autoplay
                style="max-width:90vw;max-height:85vh;"></video>`;
        } else {
            mediaEl.innerHTML = `<img src="${f.url}" alt="${f.filename}"
                style="max-width:90vw;max-height:85vh;object-fit:contain;">`;
        }

        document.getElementById('lb-counter').textContent =
            `${this.currentIndex + 1} / ${this.currentFiles.length}`;
        document.getElementById('lb-author').textContent =
            f.author ? `📸 ${f.author}` : '';

        const dl = document.getElementById('lb-download');
        dl.href = f.url;
        dl.download = f.filename;

        document.getElementById('lb-prev').disabled = this.currentIndex === 0;
        document.getElementById('lb-next').disabled =
            this.currentIndex === this.currentFiles.length - 1;
    },

    toggleFullscreen() {
        const lb = document.getElementById('lightbox');
        if (!document.fullscreenElement) lb.requestFullscreen();
        else document.exitFullscreen();
    }
};

// Keyboard navigation
document.addEventListener('keydown', e => {
    if (!document.getElementById('lightbox').classList.contains('active')) return;
    if (e.key === 'Escape') AdminGallery.closeLightbox();
    if (e.key === 'ArrowLeft') AdminGallery.nav(-1);
    if (e.key === 'ArrowRight') AdminGallery.nav(1);
});

// --- Rendering helpers ---
function renderGrid(files, gridEl, storeKey) {
    AdminGallery.fileStores[storeKey] = files;

    if (!files.length) {
        gridEl.innerHTML = '<div class="empty-folder">Nessuna foto.</div>';
        return;
    }

    gridEl.innerHTML = files.map((f, i) => `
        <div class="gallery-item" onclick="AdminGallery.openFor('${storeKey}', ${i})">
            ${f.is_video
                ? `<video src="${f.url}" preload="metadata"></video>`
                : `<img src="${f.url}" loading="lazy" alt="${f.filename}">`
            }
            ${f.author ? `<div class="author">📸 ${f.author}</div>` : ''}
        </div>
    `).join('');
}

// --- Data Loading ---
async function loadPublicGallery() {
    const res = await fetch('/api/admin/public', { headers: Auth.authHeaders() });
    const files = await res.json();

    document.getElementById('stat-public').textContent = files.length;
    document.getElementById('public-count').textContent = files.length;

    const grid = document.getElementById('admin-public-grid');
    if (!files.length) {
        grid.innerHTML = '<div class="empty-folder">Nessuna foto pubblica ancora.</div>';
        return;
    }

    renderGrid(files, grid, 'public-all');
}

async function loadPrivateFolders() {
    const usersRes = await fetch('/api/admin/users', { headers: Auth.authHeaders() });
    const users = await usersRes.json();

    document.getElementById('stat-users').textContent = users.length;
    document.getElementById('private-count').textContent = users.length;

    const container = document.getElementById('private-folders');

    if (!users.length) {
        container.innerHTML = '<div class="loading-state">Nessun upload privato trovato.</div>';
        return;
    }

    container.innerHTML = '';
    let totalPrivate = 0;

    for (const [idx, user] of users.entries()) {
        const filesRes = await fetch(`/api/admin/private/${user}`, { headers: Auth.authHeaders() });
        const files = await filesRes.json();
        totalPrivate += files.length;

        const storeKey = `private-${idx}`;
        const folderId = `folder-body-${idx}`;
        const gridId = `folder-grid-${idx}`;

        // Create folder accordion element
        const folderEl = document.createElement('div');
        folderEl.className = 'user-folder';
        folderEl.innerHTML = `
            <div class="user-folder-header" onclick="toggleFolder(this, '${folderId}')">
                <div class="folder-info">
                    <span>📂 ${user}</span>
                    <span class="file-count">${files.length} file</span>
                </div>
                <span class="chevron">▼</span>
            </div>
            <div class="user-folder-body" id="${folderId}">
                <div class="admin-grid" id="${gridId}"></div>
            </div>
        `;

        container.appendChild(folderEl);

        // Render grid inside the folder
        const gridEl = document.getElementById(gridId);
        renderGrid(files, gridEl, storeKey);
    }

    document.getElementById('stat-private').textContent = totalPrivate;
}

function toggleFolder(headerEl, bodyId) {
    headerEl.classList.toggle('open');
    document.getElementById(bodyId).classList.toggle('open');
}

// --- Init ---
async function init() {
    await Promise.all([
        loadPublicGallery(),
        loadPrivateFolders()
    ]);
}

init();
