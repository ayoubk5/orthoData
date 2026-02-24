const fs = require('fs');
const path = require('path');

/**
 * Generates an HTML gallery for a directory
 * @param {string} urlPath - The URL path (requests path)
 * @param {string} localPath - The absolute local system path
 * @returns {string} HTML content
 */
function generateGalleryHTML(urlPath, localPath) {
    let files = [];
    try {
        files = fs.readdirSync(localPath);
    } catch (e) {
        return `<h1>Error reading directory</h1><p>${e.message}</p>`;
    }

    // Filter and Sort
    const items = files.map(file => {
        const fullPath = path.join(localPath, file);
        let stats;
        try {
            stats = fs.statSync(fullPath);
        } catch (e) {
            return null;
        }
        return {
            name: file,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            size: stats.size,
            mtime: stats.mtime,
            type: getFileType(file)
        };
    }).filter(Boolean);

    items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
    });

    const dirs = items.filter(i => i.isDirectory);
    // Media includes images and videos
    const mediaFiles = items.filter(i => !i.isDirectory && (i.type === 'image' || i.type === 'video'));
    // Files that can be previewed (PDF) or just downloaded
    const otherFiles = items.filter(i => !i.isDirectory && i.type !== 'image' && i.type !== 'video');

    // Breadcrumbs
    const parts = urlPath.split('/').filter(p => p);
    let breadcrumbsHtml = `<a href="/explorer/">🏠 Accueil</a>`;
    let currentLink = '/explorer';
    parts.forEach((part, index) => {
        currentLink += '/' + part;
        if (index === parts.length - 1) {
            breadcrumbsHtml += ` <span class="sep">/</span> <span class="current">${decodeURIComponent(part)}</span>`;
        } else {
            breadcrumbsHtml += ` <span class="sep">/</span> <a href="${currentLink}">${decodeURIComponent(part)}</a>`;
        }
    });

    const parentLink = urlPath === '/' || urlPath === '' ? null : '..';

    // Prepare media items for JS array
    const lightboxItems = mediaFiles.map(f => ({
        name: f.name,
        type: f.type,
        src: encodeURIComponent(f.name)
    }));

    // Add PDFs to lightbox items if we want to preview them in the same viewer
    // For now, let's keep PDFs separate or handle them via the file list actions

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dossier: ${urlPath}</title>
    <style>
        :root {
            --bg-color: #f5f7fa;
            --card-bg: #ffffff;
            --text-color: #2d3436;
            --accent-color: #6c5ce7;
            --border-color: #dfe6e9;
        }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: var(--bg-color); color: var(--text-color); margin: 0; padding: 20px; }
        h1 { font-size: 1.5rem; margin-bottom: 20px; color: #2c3e50; }
        a { text-decoration: none; color: var(--accent-color); }
        a:hover { text-decoration: underline; }
        
        .breadcrumbs { background: var(--card-bg); padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 20px; font-size: 1.1em; }
        .sep { color: #b2bec3; margin: 0 5px; }
        .current { color: #636e72; font-weight: 600; }

        .section-title { margin: 30px 0 15px; font-size: 1.2rem; border-bottom: 2px solid var(--border-color); padding-bottom: 10px; display: flex; align-items: center; gap: 10px; }
        
        /* Folders */
        .folder-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
        .folder-item { background: var(--card-bg); padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: transform 0.2s; display: flex; alignItems: center; gap: 10px; border: 1px solid transparent; }
        .folder-item:hover { transform: translateY(-3px); border-color: var(--accent-color); }
        .folder-icon { font-size: 1.5rem; }
        .folder-name { font-weight: 500; word-break: break-word; }

        /* Media Grid */
        .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
        .media-card { background: var(--card-bg); border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; aspect-ratio: 16/10; position: relative; }
        .media-card:hover { transform: scale(1.02); box-shadow: 0 8px 15px rgba(0,0,0,0.15); z-index: 10; }
        
        .media-thumb, .media-video-shim { width: 100%; height: 100%; object-fit: cover; }
        .media-video-shim { background: #000; display: flex; justify-content: center; align-items: center; color: white; font-size: 3rem; }
        
        .media-info { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; padding: 8px; font-size: 0.8rem; opacity: 0; transition: opacity 0.3s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .media-card:hover .media-info { opacity: 1; }
        
        .type-badge { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7em; font-weight: bold; }

        /* Files List (Enhanced) */
        .file-list { margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
        .file-card { background: var(--card-bg); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 12px; transition: background 0.2s; }
        .file-card:hover { background: #fafafa; border-color: var(--accent-color); }
        .file-icon { font-size: 1.5rem; }
        .file-details { flex: 1; min-width: 0; }
        .file-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
        .file-meta { font-size: 0.8em; color: #999; }
        .file-actions { display: flex; gap: 5px; }
        .action-btn { padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border-color); background: white; cursor: pointer; font-size: 0.8em; }
        .action-btn:hover { background: var(--accent-color); color: white; border-color: var(--accent-color); }

        /* Lightbox */
        .lightbox { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 1000; justify-content: center; align-items: center; }
        .lightbox.active { display: flex; }
        .lightbox-content-container { position: relative; max-width: 90%; max-height: 90vh; display: flex; justify-content: center; align-items: center; }
        
        .lightbox-media { max-width: 100%; max-height: 90vh; border-radius: 4px; box-shadow: 0 0 20px rgba(0,0,0,0.5); transition: transform 0.1s linear; cursor: grab; user-select: none; }
        .lightbox-media:active { cursor: grabbing; }
        /* Iframe for PDF */
        .lightbox-iframe { width: 80vw; height: 85vh; background: white; border-radius: 4px; border: none; }

        .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.1); color: white; border: none; font-size: 3rem; padding: 20px; cursor: pointer; border-radius: 50%; width: 80px; height: 80px; display: flex; justify-content: center; align-items: center; transition: background 0.3s; user-select: none; z-index: 1010; }
        
        /* Zoom Control Styles */
        .zoom-controls { position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); display: flex; gap: 15px; z-index: 1010; background: rgba(0,0,0,0.6); padding: 10px 20px; border-radius: 30px; }
        .zoom-btn { background: none; border: 2px solid white; color: white; width: 40px; height: 40px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: background 0.2s, transform 0.1s; }
        .zoom-btn:hover { background: rgba(255,255,255,0.2); }
        .zoom-btn:active { transform: scale(0.95); }

        .lightbox-nav:hover { background: rgba(255,255,255,0.3); }
        .prev { left: 20px; }
        .next { right: 20px; }
        
        .close { position: absolute; top: 20px; right: 30px; color: white; font-size: 3rem; cursor: pointer; opacity: 0.7; transition: opacity 0.3s; z-index: 1020; }
        .close:hover { opacity: 1; }
        
        .lightbox-caption { position: absolute; bottom: -40px; left: 0; right: 0; text-align: center; color: white; font-size: 1.1rem; }
    </style>
</head>
<body>

    <div class="breadcrumbs">
        ${breadcrumbsHtml}
    </div>

    ${parentLink ? `
        <div class="folder-list" style="margin-bottom: 20px;">
            <a href="${parentLink}" class="folder-item">
                <span class="folder-icon">⬆️</span>
                <span class="folder-name">Dossier Parent</span>
            </a>
        </div>
    ` : ''}

    ${dirs.length > 0 ? `
        <h2 class="section-title">📁 Dossiers</h2>
        <div class="folder-list">
            ${dirs.map(d => `
                <a href="${encodeURIComponent(d.name)}/" class="folder-item">
                    <span class="folder-icon">📂</span>
                    <span class="folder-name">${d.name}</span>
                </a>
            `).join('')}
        </div>
    ` : ''}

    ${mediaFiles.length > 0 ? `
        <h2 class="section-title">🎞️ Médias (Photos & Vidéos)</h2>
        <div class="image-grid">
            ${mediaFiles.map((f, index) => {
        // Determine display content
        let content = '';
        if (f.type === 'video') {
            content = `
                        <div class="media-video-shim">►</div>
                        <div class="type-badge">VIDEO</div>
                    `;
        } else {
            content = `<img src="${encodeURIComponent(f.name)}" class="media-thumb" loading="lazy" alt="${f.name}">`;
        }

        return `
                <div class="media-card" onclick="openLightbox(${index})">
                    ${content}
                    <div class="media-info">${f.name}</div>
                </div>
                `;
    }).join('')}
        </div>
    ` : ''}

    ${otherFiles.length > 0 ? `
        <h2 class="section-title">📄 Documents & Fichiers</h2>
        <div class="file-list">
            ${otherFiles.map(f => {
        let icon = '📄';
        if (f.type === 'pdf') icon = '📕';
        if (f.type === 'text') icon = '📝';

        let previewBtn = '';
        if (f.type === 'pdf') {
            previewBtn = `<button class="action-btn" onclick="openPdfPreview('${encodeURIComponent(f.name)}')">👁️ Aperçu</button>`;
        }

        return `
                <div class="file-card">
                     <span class="file-icon">${icon}</span>
                     <div class="file-details">
                        <a href="${encodeURIComponent(f.name)}" class="file-name" target="_blank" download>${f.name}</a>
                        <span class="file-meta">${formatSize(f.size)} • ${f.type.toUpperCase()}</span>
                     </div>
                     <div class="file-actions">
                        ${previewBtn}
                        <a href="${encodeURIComponent(f.name)}" class="action-btn" download>⬇️</a>
                     </div>
                </div>
            `;
    }).join('')}
        </div>
    ` : ''}

    <!-- Lightbox -->
    <div id="lightbox" class="lightbox">
        <span class="close" onclick="closeLightbox()">&times;</span>
        
        <button id="btn-prev" class="lightbox-nav prev" onclick="changeImage(-1)">&#10094;</button>
        
        <div class="lightbox-content-container" id="lightbox-container">
            <!-- Content injected via JS -->
        </div>

        <button id="btn-next" class="lightbox-nav next" onclick="changeImage(1)">&#10095;</button>
        
        <div id="zoom-controls" class="zoom-controls" style="display: none;">
            <button class="zoom-btn" onclick="zoomOut()" title="Zoom Out (-)">−</button>
            <button class="zoom-btn" onclick="resetZoom()" title="Reset Zoom (100%)">⟳</button>
            <button class="zoom-btn" onclick="zoomIn()" title="Zoom In (+)">+</button>
        </div>
        
        <div id="lightbox-caption" class="lightbox-caption"></div>
    </div>

    <script>
        const mediaItems = ${JSON.stringify(lightboxItems)};
        let currentIndex = -1;
        let isPdfMode = false;
        let currentZoom = 1;
        let translateX = 0;
        let translateY = 0;
        let isDragging = false;
        let startX, startY;
        
        const ZOOM_STEP = 0.25;
        const MIN_ZOOM = 0.5;
        const MAX_ZOOM = 5.0;

        function openLightbox(index) {
            if (index < 0 || index >= mediaItems.length) return;
            currentIndex = index;
            isPdfMode = false;
            updateLightbox();
            document.getElementById('lightbox').classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Show nav buttons for media
            document.getElementById('btn-prev').style.display = 'flex';
            document.getElementById('btn-next').style.display = 'flex';
            
            // Show zoom buttons only for images
            const currentItem = mediaItems[index];
            if (currentItem.type === 'image') {
                document.getElementById('zoom-controls').style.display = 'flex';
            } else {
                document.getElementById('zoom-controls').style.display = 'none';
            }
            
            resetZoom();
        }

        function openPdfPreview(url) {
            currentIndex = -1; // Deselect media
            isPdfMode = true;
            
            const container = document.getElementById('lightbox-container');
            container.innerHTML = \`<iframe src="\${url}" class="lightbox-iframe"></iframe>\`;
            document.getElementById('lightbox-caption').textContent = decodeURIComponent(url);
            
            document.getElementById('lightbox').classList.add('active');
            document.body.style.overflow = 'hidden';

            // Hide nav buttons for PDF mode (single file preview)
            document.getElementById('btn-prev').style.display = 'none';
            document.getElementById('btn-next').style.display = 'none';
            document.getElementById('zoom-controls').style.display = 'none';
        }

        function closeLightbox() {
            const container = document.getElementById('lightbox-container');
            container.innerHTML = ''; // Clear content to stop video playback
            
            document.getElementById('lightbox').classList.remove('active');
            document.body.style.overflow = '';
            currentIndex = -1;
            isPdfMode = false;
        }

        function changeImage(direction) {
            if (currentIndex === -1 || isPdfMode) return;
            
            // Allow cycling
            let newIndex = currentIndex + direction;
            if (newIndex < 0) newIndex = mediaItems.length - 1;
            if (newIndex >= mediaItems.length) newIndex = 0;
            
            currentIndex = newIndex;
            updateLightbox();
            
            // Re-evaluate zoom controls visibility
            const currentItem = mediaItems[currentIndex];
            if (currentItem.type === 'image') {
                document.getElementById('zoom-controls').style.display = 'flex';
            } else {
                document.getElementById('zoom-controls').style.display = 'none';
            }
            resetZoom();
        }
        
        function zoomIn() {
            if (currentZoom < MAX_ZOOM) {
                currentZoom += ZOOM_STEP;
                applyZoom();
            }
        }

        function zoomOut() {
            if (currentZoom > MIN_ZOOM) {
                currentZoom -= ZOOM_STEP;
                applyZoom();
            }
        }

        function resetZoom() {
            currentZoom = 1;
            translateX = 0;
            translateY = 0;
            applyZoom();
        }

        function applyZoom() {
            const img = document.querySelector('.lightbox-media');
            if (img && img.tagName === 'IMG') {
                img.style.transform = \`translate(\${translateX}px, \${translateY}px) scale(\${currentZoom})\`;
                
                // Update cursor based on zoom
                if (currentZoom > 1) {
                    img.style.cursor = 'grab';
                } else {
                    img.style.cursor = 'default';
                }
            }
        }

        // --- DRAG TO PAN LOGIC ---
        function startDrag(e) {
            if (currentZoom <= 1) return;
            const img = document.querySelector('.lightbox-media');
            if (!img || img.tagName !== 'IMG') return;

            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            img.style.cursor = 'grabbing';
            img.style.transition = 'none'; // Disable transition for smooth drag
            e.preventDefault(); // Prevent default drag behavior
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            
            const img = document.querySelector('.lightbox-media');
            if (img) {
                img.style.transform = \`translate(\${translateX}px, \${translateY}px) scale(\${currentZoom})\`;
            }
        }

        function endDrag() {
            if (!isDragging) return;
            isDragging = false;
            const img = document.querySelector('.lightbox-media');
            if (img) {
                img.style.cursor = 'grab';
                img.style.transition = 'transform 0.1s linear'; // Re-enable transition
            }
        }
        
        // Retrieve media element freshly
        function attachDragListeners() {
             const img = document.querySelector('.lightbox-media');
             if (img && img.tagName === 'IMG') {
                 img.addEventListener('mousedown', startDrag);
                 window.addEventListener('mousemove', drag);
                 window.addEventListener('mouseup', endDrag);
                 
                 // Clean up listeners when image changes? Handled by recreating img element actually
                 // But window listeners accumulate... optimization:
                 // Ideally attach to container or handle clean up.
                 // For now, simple implementation:
             }
        }
        
        // Optimization: Single global listeners for mousemove/up
        window.addEventListener('mousemove', drag);
        window.addEventListener('mouseup', endDrag);

        function updateLightbox() {
            if (currentIndex === -1) return;
            
            const item = mediaItems[currentIndex];
            const container = document.getElementById('lightbox-container');
            
            // Helper to determine media tag
            if (item.type === 'video') {
                container.innerHTML = \`
                    <video controls autoplay class="lightbox-media">
                        <source src="\${item.src}" type="video/mp4">
                        <source src="\${item.src}" type="video/webm">
                        Votre navigateur ne supporte pas la vidéo.
                    </video>
                \`;
            } else {
                container.innerHTML = \`<img src="\${item.src}" class="lightbox-media" alt="\${item.name}" onmousedown="startDrag(event)">\`;
            }

            document.getElementById('lightbox-caption').textContent = item.name;
        }

        document.addEventListener('keydown', function(e) {
            if (!document.getElementById('lightbox').classList.contains('active')) return;
            
            if (e.key === 'Escape') closeLightbox();
            
            if (!isPdfMode) {
                if (e.key === 'ArrowLeft') changeImage(-1);
                if (e.key === 'ArrowRight') changeImage(1);
                // Zoom shortcuts
                if (e.key === '+' || e.key === '=') zoomIn();
                if (e.key === '-') zoomOut();
                if (e.key === '0') resetZoom();
            }
        });
        
        // Mouse Wheel Zoom
        document.getElementById('lightbox-container').addEventListener('wheel', function(e) {
            if (isPdfMode || currentIndex === -1) return;
            const item = mediaItems[currentIndex];
            if (item.type !== 'image') return;
            
            e.preventDefault();
            if (e.deltaY < 0) zoomIn();
            else zoomOut();
        });
        
        document.getElementById('lightbox').addEventListener('click', function(e) {
            if (e.target === this) closeLightbox();
        });
    </script>
</body>
</html>
    `;
}

function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    // Extended image list
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff', '.tif', '.avif', '.apng', '.heic', '.heif', '.HEIC'].includes(ext)) return 'image';
    if (['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'].includes(ext)) return 'video';
    if (['.pdf'].includes(ext)) return 'pdf';
    return 'other'; // text, docx, etc.
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

module.exports = { generateGalleryHTML };

