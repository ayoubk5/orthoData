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

    const items = files.map(file => {
        const fullPath = path.join(localPath, file);
        let stats;
        try { stats = fs.statSync(fullPath); } catch (e) { return null; }
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
    const mediaFiles = items.filter(i => !i.isDirectory && (i.type === 'image' || i.type === 'video'));
    const otherFiles = items.filter(i => !i.isDirectory && i.type !== 'image' && i.type !== 'video');

    // Breadcrumbs
    const parts = urlPath.split('/').filter(p => p);
    let breadcrumbsHtml = `<a href="/explorer/" class="bc-link"><span class="bc-home">🏠</span> Accueil</a>`;
    let currentLink = '/explorer';
    parts.forEach((part, index) => {
        currentLink += '/' + part;
        if (index === parts.length - 1) {
            breadcrumbsHtml += `<span class="bc-sep">›</span><span class="bc-current">${decodeURIComponent(part)}</span>`;
        } else {
            breadcrumbsHtml += `<span class="bc-sep">›</span><a href="${currentLink}" class="bc-link">${decodeURIComponent(part)}</a>`;
        }
    });

    const parentLink = urlPath === '/' || urlPath === '' ? null : '..';

    const lightboxItems = mediaFiles.map(f => ({
        name: f.name,
        type: f.type,
        src: encodeURIComponent(f.name)
    }));

    const totalItems = dirs.length + mediaFiles.length + otherFiles.length;
    const folderTitle = parts.length > 0 ? decodeURIComponent(parts[parts.length - 1]).replace(/_/g, ' ') : 'Explorateur';

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${folderTitle} — OrthoData Explorer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --bg:        #0d1117;
            --bg2:       #161b22;
            --bg3:       #21262d;
            --border:    #30363d;
            --text:      #e6edf3;
            --muted:     #8b949e;
            --blue:      #388bfd;
            --blue-glow: rgba(56,139,253,0.25);
            --green:     #3fb950;
            --purple:    #a371f7;
            --orange:    #f0883e;
            --red:       #f85149;
            --radius:    12px;
        }

        /* Light mode overrides */
        html.light {
            --bg:        #f5f7fa;
            --bg2:       #ffffff;
            --bg3:       #f0f2f5;
            --border:    #d0d7de;
            --text:      #1f2328;
            --muted:     #57606a;
            --blue:      #0969da;
            --blue-glow: rgba(9,105,218,0.2);
            --green:     #1a7f37;
            --orange:    #bc4c00;
            --red:       #cf222e;
        }

        html, html.light { scroll-behavior: smooth; }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            padding: 0;
            transition: background 0.3s, color 0.3s;
        }

        /* ── TOP BAR ── */
        .topbar {
            position: sticky;
            top: 0;
            z-index: 200;
            background: rgba(13,17,23,0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid var(--border);
            padding: 14px 32px;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: background 0.3s, border-color 0.3s;
        }
        html.light .topbar { background: rgba(245,247,250,0.9); }

        .topbar-logo {
            font-size: 20px;
            font-weight: 700;
            color: var(--text);
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
        }
        .topbar-logo span { color: var(--blue); }

        .topbar-search {
            flex: 1;
            max-width: 480px;
            position: relative;
        }
        .topbar-search input {
            width: 100%;
            background: var(--bg3);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text);
            padding: 9px 14px 9px 38px;
            font-size: 14px;
            font-family: inherit;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .topbar-search input::placeholder { color: var(--muted); }
        .topbar-search input:focus {
            border-color: var(--blue);
            box-shadow: 0 0 0 3px var(--blue-glow);
        }
        .topbar-search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--muted);
            font-size: 14px;
            pointer-events: none;
        }

        .topbar-stats {
            margin-left: auto;
            background: var(--bg3);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 6px 14px;
            font-size: 13px;
            color: var(--muted);
            white-space: nowrap;
        }
        .topbar-stats strong { color: var(--text); }

        /* Theme toggle */
        .theme-toggle {
            background: var(--bg3);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 7px 14px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-family: inherit;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            transition: all 0.2s;
        }
        .theme-toggle:hover {
            border-color: var(--blue);
            background: rgba(56,139,253,0.08);
            color: var(--blue);
        }

        /* ── LAYOUT ── */
        .page-wrap {
            max-width: 1400px;
            margin: 0 auto;
            padding: 28px 32px 60px;
        }

        /* ── BREADCRUMBS ── */
        .breadcrumbs {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
            font-size: 14px;
            margin-bottom: 28px;
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 12px 18px;
        }
        .bc-home { font-size: 16px; }
        .bc-link { color: var(--blue); text-decoration: none; font-weight: 500; transition: color 0.15s; }
        .bc-link:hover { color: #58a6ff; text-decoration: underline; }
        .bc-sep { color: var(--muted); margin: 0 3px; }
        .bc-current { color: var(--text); font-weight: 600; }

        /* ── SECTION HEADERS ── */
        .section-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 32px 0 16px;
        }
        .section-header h2 {
            font-size: 16px;
            font-weight: 600;
            color: var(--text);
        }
        .section-count {
            background: var(--bg3);
            border: 1px solid var(--border);
            color: var(--muted);
            font-size: 12px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 20px;
        }
        .section-line {
            flex: 1;
            height: 1px;
            background: var(--border);
        }

        /* ── BACK BUTTON ── */
        .back-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: var(--bg3);
            border: 1px solid var(--border);
            color: var(--muted);
            padding: 8px 14px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 24px;
            transition: all 0.2s;
            cursor: pointer;
        }
        .back-btn:hover {
            color: var(--text);
            border-color: var(--blue);
            background: rgba(56,139,253,0.08);
        }

        /* ── FOLDER GRID ── */
        .folder-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 12px;
        }

        .folder-card {
            display: flex;
            align-items: center;
            gap: 12px;
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 16px;
            text-decoration: none;
            color: var(--text);
            transition: all 0.2s;
            cursor: pointer;
        }
        .folder-card:hover {
            border-color: var(--blue);
            background: rgba(56,139,253,0.06);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .folder-card-icon {
            font-size: 28px;
            flex-shrink: 0;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
        }
        .folder-card-name {
            font-size: 14px;
            font-weight: 500;
            word-break: break-word;
            line-height: 1.4;
        }
        .folder-card-meta {
            font-size: 12px;
            color: var(--muted);
            margin-top: 2px;
        }

        /* ── MEDIA GRID ── */
        .media-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
        }

        .media-card {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden;
            aspect-ratio: 4/3;
            position: relative;
            cursor: pointer;
            transition: all 0.2s;
            group: true;
        }
        .media-card:hover {
            border-color: var(--blue);
            transform: translateY(-3px);
            box-shadow: 0 12px 32px rgba(0,0,0,0.5);
        }
        .media-card img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            transition: transform 0.3s;
        }
        .media-card:hover img { transform: scale(1.04); }

        .media-video-thumb {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #161b22, #0d1117);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 8px;
            color: var(--muted);
        }
        .media-video-play {
            width: 52px;
            height: 52px;
            background: rgba(56,139,253,0.2);
            border: 2px solid var(--blue);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            color: var(--blue);
            transition: all 0.2s;
        }
        .media-card:hover .media-video-play {
            background: var(--blue);
            color: white;
            transform: scale(1.1);
        }

        .media-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.85));
            padding: 28px 10px 10px;
            opacity: 0;
            transition: opacity 0.2s;
        }
        .media-card:hover .media-overlay { opacity: 1; }
        .media-overlay-name {
            font-size: 12px;
            color: white;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .media-type-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(0,0,0,0.7);
            color: var(--orange);
            font-size: 10px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 4px;
            letter-spacing: 0.5px;
        }
        .media-index-badge {
            position: absolute;
            top: 8px;
            left: 8px;
            background: rgba(0,0,0,0.5);
            color: var(--muted);
            font-size: 11px;
            font-weight: 600;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .file-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 10px;
        }

        .file-card {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 10px;
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 12px 14px;
            transition: all 0.2s;
        }
        .file-card:hover {
            border-color: var(--blue);
            background: rgba(56,139,253,0.05);
        }
        .file-icon-wrap {
            width: 38px;
            height: 38px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }
        .file-icon-wrap.pdf { background: rgba(248,81,73,0.12); }
        .file-icon-wrap.doc { background: rgba(56,139,253,0.12); }
        .file-icon-wrap.other { background: rgba(139,148,158,0.12); }

        .file-details { flex: 1; min-width: 0; }
        .file-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--text);
            text-decoration: none;
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            transition: color 0.15s;
        }
        .file-name:hover { color: var(--blue); }
        .file-meta {
            font-size: 12px;
            color: var(--muted);
            margin-top: 4px;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
        }
        .file-meta-badge {
            background: var(--bg3);
            border: 1px solid var(--border);
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .file-actions {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
            margin-left: auto;
        }
        .btn-action {
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid var(--border);
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
            font-family: inherit;
        }
        .btn-preview {
            background: rgba(56,139,253,0.1);
            color: var(--blue);
            border-color: rgba(56,139,253,0.3);
        }
        .btn-preview:hover { background: var(--blue); color: white; }
        .btn-download {
            background: rgba(63,185,80,0.1);
            color: var(--green);
            border-color: rgba(63,185,80,0.3);
        }
        .btn-download:hover { background: var(--green); color: white; }

        /* ── EMPTY STATE ── */
        .empty-state {
            text-align: center;
            padding: 64px 32px;
            color: var(--muted);
        }
        .empty-state-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
        .empty-state h3 { font-size: 18px; color: var(--text); margin-bottom: 8px; }
        .empty-state p { font-size: 14px; }

        /* ── LIGHTBOX ── */
        .lightbox {
            display: none;
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.96);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        }
        .lightbox.active { display: flex; }

        .lightbox-topbar {
            position: absolute;
            top: 0; left: 0; right: 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
            z-index: 1010;
        }
        .lightbox-title {
            color: white;
            font-size: 14px;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 60%;
        }
        .lightbox-counter {
            color: var(--muted);
            font-size: 13px;
            background: rgba(255,255,255,0.08);
            padding: 4px 12px;
            border-radius: 20px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .lightbox-close {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.15);
            color: white;
            width: 36px; height: 36px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s;
        }
        .lightbox-close:hover { background: var(--red); border-color: var(--red); }

        .lightbox-content {
            max-width: 90vw;
            max-height: 80vh;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .lightbox-media {
            max-width: 100%;
            max-height: 80vh;
            border-radius: 6px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);
            transition: transform 0.1s;
            cursor: grab;
            user-select: none;
        }
        .lightbox-media:active { cursor: grabbing; }
        .lightbox-iframe { width: 80vw; height: 82vh; border: none; border-radius: 6px; background: white; }

        .lightbox-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.12);
            color: white;
            width: 56px; height: 56px;
            border-radius: 50%;
            font-size: 22px;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s;
            z-index: 1010;
        }
        .lightbox-nav:hover { background: rgba(56,139,253,0.4); border-color: var(--blue); }
        .lb-prev { left: 20px; }
        .lb-next { right: 20px; }

        .lightbox-bottombar {
            position: absolute;
            bottom: 0; left: 0; right: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 20px;
            background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        }
        .zoom-btn {
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);
            color: white;
            width: 40px; height: 40px;
            border-radius: 50%;
            font-size: 18px;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s;
            font-family: inherit;
        }
        .zoom-btn:hover { background: rgba(56,139,253,0.4); border-color: var(--blue); }
        .zoom-level {
            color: rgba(255,255,255,0.6);
            font-size: 13px;
            min-width: 48px;
            text-align: center;
        }
        .lb-separator {
            width: 1px;
            height: 28px;
            background: rgba(255,255,255,0.15);
            border-radius: 1px;
            margin: 0 4px;
        }

        /* ── SEARCH FILTER ── */
        .filter-bar {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .filter-chip {
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            border: 1px solid var(--border);
            background: var(--bg3);
            color: var(--muted);
            cursor: pointer;
            transition: all 0.2s;
        }
        .filter-chip:hover, .filter-chip.active {
            background: rgba(56,139,253,0.15);
            border-color: var(--blue);
            color: var(--blue);
        }

        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--muted); }

        /* ── ANIMATION  ── */
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0);    }
        }
        .anim { animation: fadeUp 0.4s ease both; }
        .anim-delay-1 { animation-delay: 0.05s; }
        .anim-delay-2 { animation-delay: 0.10s; }
        .anim-delay-3 { animation-delay: 0.15s; }
    </style>
</head>
<body>

<!-- TOP BAR -->
<header class="topbar">
    <a href="/explorer/" class="topbar-logo">🩺 <span>Ortho</span>Data</a>
    <div class="topbar-search">
        <span class="topbar-search-icon">🔍</span>
        <input type="text" id="search-input" placeholder="Filtrer les fichiers…" oninput="filterItems(this.value)">
    </div>
    <div class="topbar-stats"><strong>${totalItems}</strong> éléments</div>
    <button class="theme-toggle" id="theme-btn" onclick="toggleTheme()" title="Changer le thème">
        <span id="theme-icon">☀️</span>
        <span id="theme-label">Mode clair</span>
    </button>
</header>

<div class="page-wrap">

    <!-- BREADCRUMBS -->
    <nav class="breadcrumbs anim">
        ${breadcrumbsHtml}
    </nav>

    ${parentLink ? `<a href="${parentLink}" class="back-btn anim anim-delay-1">← Dossier parent</a>` : ''}

    <!-- FILTER CHIPS -->
    <div class="filter-bar anim anim-delay-1">
        <button class="filter-chip active" onclick="setFilter('all', this)">Tout (${totalItems})</button>
        ${dirs.length > 0 ? `<button class="filter-chip" onclick="setFilter('folders', this)">📁 Dossiers (${dirs.length})</button>` : ''}
        ${mediaFiles.length > 0 ? `<button class="filter-chip" onclick="setFilter('media', this)">🎞️ Médias (${mediaFiles.length})</button>` : ''}
        ${otherFiles.length > 0 ? `<button class="filter-chip" onclick="setFilter('files', this)">📄 Fichiers (${otherFiles.length})</button>` : ''}
    </div>

    <!-- FOLDERS -->
    ${dirs.length > 0 ? `
    <div id="section-folders">
        <div class="section-header anim anim-delay-2">
            <h2>📁 Dossiers</h2>
            <span class="section-count">${dirs.length}</span>
            <div class="section-line"></div>
        </div>
        <div class="folder-grid anim anim-delay-2">
            ${dirs.map(d => `
            <a href="${encodeURIComponent(d.name)}/" class="folder-card" data-name="${d.name.toLowerCase()}">
                <span class="folder-card-icon">📂</span>
                <div>
                    <div class="folder-card-name">${d.name}</div>
                    <div class="folder-card-meta">${new Date(d.mtime).toLocaleDateString('fr-FR')}</div>
                </div>
            </a>`).join('')}
        </div>
    </div>` : ''}

    <!-- MEDIA -->
    ${mediaFiles.length > 0 ? `
    <div id="section-media">
        <div class="section-header anim anim-delay-2">
            <h2>🎞️ Médias</h2>
            <span class="section-count">${mediaFiles.length}</span>
            <div class="section-line"></div>
        </div>
        <div class="media-grid anim anim-delay-3">
            ${mediaFiles.map((f, index) => {
                let inner = '';
                if (f.type === 'video') {
                    inner = `
                    <div class="media-video-thumb">
                        <div class="media-video-play">▶</div>
                        <span style="font-size:12px;">${f.name}</span>
                    </div>
                    <span class="media-type-badge">VIDÉO</span>`;
                } else {
                    inner = `<img src="${encodeURIComponent(f.name)}" loading="lazy" alt="${f.name}">`;
                }
                return `
            <div class="media-card" onclick="openLightbox(${index})" data-name="${f.name.toLowerCase()}" title="${f.name}">
                ${inner}
                <div class="media-overlay"><div class="media-overlay-name">${f.name}</div></div>
                <span class="media-index-badge">${index + 1}</span>
            </div>`;
            }).join('')}
        </div>
    </div>` : ''}

    <!-- OTHER FILES -->
    ${otherFiles.length > 0 ? `
    <div id="section-files">
        <div class="section-header anim anim-delay-2">
            <h2>📄 Documents &amp; Fichiers</h2>
            <span class="section-count">${otherFiles.length}</span>
            <div class="section-line"></div>
        </div>
        <div class="file-list anim anim-delay-3">
            ${otherFiles.map(f => {
                let icon = '📄', iconClass = 'other';
                if (f.type === 'pdf')  { icon = '📕'; iconClass = 'pdf'; }
                if (f.type === 'doc')  { icon = '📘'; iconClass = 'doc'; }

                let previewBtn = '';
                if (f.type === 'pdf') {
                    previewBtn = `<button class="btn-action btn-preview" onclick="openPdfPreview('${encodeURIComponent(f.name)}')">👁 Aperçu</button>`;
                }

                return `
            <div class="file-card" data-name="${f.name.toLowerCase()}">
                <div class="file-icon-wrap ${iconClass}">${icon}</div>
                <div class="file-details">
                    <a href="${encodeURIComponent(f.name)}" class="file-name" target="_blank" download>${f.name}</a>
                    <div class="file-meta">
                        <span>${formatSize(f.size)}</span>
                        <span class="file-meta-badge">${f.type.toUpperCase()}</span>
                        <span>${new Date(f.mtime).toLocaleDateString('fr-FR')}</span>
                    </div>
                </div>
                <div class="file-actions">
                    ${previewBtn}
                    <a href="${encodeURIComponent(f.name)}" class="btn-action btn-download" download>⬇ Télécharger</a>
                </div>
            </div>`;
            }).join('')}
        </div>
    </div>` : ''}

    ${totalItems === 0 ? `
    <div class="empty-state anim">
        <div class="empty-state-icon">📭</div>
        <h3>Dossier vide</h3>
        <p>Aucun fichier dans ce dossier.</p>
    </div>` : ''}

</div>

<!-- LIGHTBOX -->
<div id="lightbox" class="lightbox">
    <div class="lightbox-topbar">
        <span id="lb-title" class="lightbox-title"></span>
        <span id="lb-counter" class="lightbox-counter">1 / ${mediaFiles.length}</span>
        <button class="lightbox-close" onclick="closeLightbox()">✕</button>
    </div>

    <button id="lb-prev" class="lightbox-nav lb-prev" onclick="changeImage(-1)">&#8249;</button>
    <div class="lightbox-content" id="lb-content"></div>
    <button id="lb-next" class="lightbox-nav lb-next" onclick="changeImage(1)">&#8250;</button>

    <div class="lightbox-bottombar" id="lb-bottom">
        <button class="zoom-btn" onclick="zoomOut()" title="Zoom -">−</button>
        <span class="zoom-level" id="zoom-label">100%</span>
        <button class="zoom-btn" onclick="resetZoom()" title="Réinitialiser">⟳</button>
        <button class="zoom-btn" onclick="zoomIn()" title="Zoom +">+</button>
        <div class="lb-separator"></div>
        <button class="zoom-btn" onclick="rotateLeft()" title="Rotation gauche ([ )">↺</button>
        <span class="zoom-level" id="rotate-label">0°</span>
        <button class="zoom-btn" onclick="rotateRight()" title="Rotation droite (])">↻</button>
    </div>
</div>

<script>
    const mediaItems = ${JSON.stringify(lightboxItems)};
    let currentIndex = -1;
    let isPdfMode = false;
    let currentZoom = 1;
    let currentRotation = 0;
    let tx = 0, ty = 0;
    let isDragging = false, startX, startY;
    const ZOOM_STEP = 0.25, MIN_ZOOM = 0.5, MAX_ZOOM = 5;
    const ROTATE_STEP = 90;

    // ── THEME TOGGLE ──
    (function initTheme() {
        const saved = localStorage.getItem('explorer-theme') || 'dark';
        if (saved === 'light') {
            document.documentElement.classList.add('light');
            document.getElementById('theme-icon').textContent = '🌙';
            document.getElementById('theme-label').textContent = 'Mode sombre';
        }
    })();

    function toggleTheme() {
        const isLight = document.documentElement.classList.toggle('light');
        const icon  = document.getElementById('theme-icon');
        const label = document.getElementById('theme-label');
        if (isLight) {
            icon.textContent  = '🌙';
            label.textContent = 'Mode sombre';
            localStorage.setItem('explorer-theme', 'light');
        } else {
            icon.textContent  = '☀️';
            label.textContent = 'Mode clair';
            localStorage.setItem('explorer-theme', 'dark');
        }
    }

    // ── SEARCH FILTER ──
    function filterItems(query) {
        const q = query.toLowerCase();
        document.querySelectorAll('[data-name]').forEach(el => {
            el.style.display = !q || el.dataset.name.includes(q) ? '' : 'none';
        });
    }

    // ── SECTION FILTER CHIPS ──
    function setFilter(type, btn) {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const sf = document.getElementById('section-folders');
        const sm = document.getElementById('section-media');
        const sx = document.getElementById('section-files');
        if (sf) sf.style.display = (type === 'all' || type === 'folders') ? '' : 'none';
        if (sm) sm.style.display = (type === 'all' || type === 'media')   ? '' : 'none';
        if (sx) sx.style.display = (type === 'all' || type === 'files')   ? '' : 'none';
    }

    // ── LIGHTBOX ──
    function openLightbox(idx) {
        currentIndex = idx;
        isPdfMode = false;
        updateLightbox();
        document.getElementById('lightbox').classList.add('active');
        document.body.style.overflow = 'hidden';
        const isImg = mediaItems[idx].type === 'image';
        document.getElementById('lb-bottom').style.display = isImg ? 'flex' : 'none';
        resetTransform();
    }

    function openPdfPreview(url) {
        currentIndex = -1;
        isPdfMode = true;
        document.getElementById('lb-content').innerHTML = \`<iframe src="\${url}" class="lightbox-iframe"></iframe>\`;
        document.getElementById('lb-title').textContent = decodeURIComponent(url);
        document.getElementById('lb-counter').style.display = 'none';
        document.getElementById('lb-prev').style.display = 'none';
        document.getElementById('lb-next').style.display = 'none';
        document.getElementById('lb-bottom').style.display = 'none';
        document.getElementById('lightbox').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        document.getElementById('lb-content').innerHTML = '';
        document.getElementById('lightbox').classList.remove('active');
        document.body.style.overflow = '';
        document.getElementById('lb-counter').style.display = '';
        document.getElementById('lb-prev').style.display = '';
        document.getElementById('lb-next').style.display = '';
        currentIndex = -1;
        currentRotation = 0;
    }

    function changeImage(dir) {
        if (isPdfMode || currentIndex === -1) return;
        currentIndex = (currentIndex + dir + mediaItems.length) % mediaItems.length;
        resetTransform();
        updateLightbox();
        const isImg = mediaItems[currentIndex].type === 'image';
        document.getElementById('lb-bottom').style.display = isImg ? 'flex' : 'none';
    }

    function updateLightbox() {
        const item = mediaItems[currentIndex];
        const container = document.getElementById('lb-content');
        if (item.type === 'video') {
            container.innerHTML = \`<video controls autoplay class="lightbox-media" style="max-height:80vh"><source src="\${item.src}">Vidéo non supportée.</video>\`;
        } else {
            container.innerHTML = \`<img src="\${item.src}" class="lightbox-media" alt="\${item.name}" onmousedown="startDrag(event)">\`;
        }
        document.getElementById('lb-title').textContent = item.name;
        document.getElementById('lb-counter').textContent = (currentIndex + 1) + ' / ' + mediaItems.length;
    }

    // ── ZOOM ──
    function zoomIn()     { if (currentZoom < MAX_ZOOM) { currentZoom += ZOOM_STEP; applyTransform(); } }
    function zoomOut()    { if (currentZoom > MIN_ZOOM) { currentZoom -= ZOOM_STEP; applyTransform(); } }
    function resetZoom()  { currentZoom = 1; tx = 0; ty = 0; applyTransform(); }
    function resetTransform() { currentZoom = 1; currentRotation = 0; tx = 0; ty = 0; applyTransform(); }

    // ── ROTATION ──
    function rotateLeft()  { currentRotation = (currentRotation - ROTATE_STEP + 360) % 360; applyTransform(); }
    function rotateRight() { currentRotation = (currentRotation + ROTATE_STEP) % 360; applyTransform(); }

    function applyTransform() {
        const img = document.querySelector('.lightbox-media');
        if (img && img.tagName === 'IMG') {
            img.style.transform = \`translate(\${tx}px, \${ty}px) scale(\${currentZoom}) rotate(\${currentRotation}deg)\`;
            img.style.cursor = currentZoom > 1 ? 'grab' : 'default';
        }
        document.getElementById('zoom-label').textContent = Math.round(currentZoom * 100) + '%';
        document.getElementById('rotate-label').textContent = currentRotation + '°';
    }

    // ── DRAG TO PAN ──
    function startDrag(e) {
        if (currentZoom <= 1) return;
        isDragging = true;
        startX = e.clientX - tx;
        startY = e.clientY - ty;
        e.preventDefault();
    }
    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        tx = e.clientX - startX;
        ty = e.clientY - startY;
        const img = document.querySelector('.lightbox-media');
        if (img) img.style.transform = \`translate(\${tx}px, \${ty}px) scale(\${currentZoom}) rotate(\${currentRotation}deg)\`;
    });
    window.addEventListener('mouseup', () => { isDragging = false; });

    // ── KEYBOARD ──
    document.addEventListener('keydown', e => {
        if (!document.getElementById('lightbox').classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (!isPdfMode) {
            if (e.key === 'ArrowLeft')  changeImage(-1);
            if (e.key === 'ArrowRight') changeImage(1);
            if (e.key === '+' || e.key === '=') zoomIn();
            if (e.key === '-') zoomOut();
            if (e.key === '0') resetZoom();
            if (e.key === '[') rotateLeft();
            if (e.key === ']') rotateRight();
        }
    });

    // ── MOUSE WHEEL ZOOM ──
    document.getElementById('lb-content').addEventListener('wheel', e => {
        if (isPdfMode || currentIndex === -1) return;
        if (mediaItems[currentIndex].type !== 'image') return;
        e.preventDefault();
        e.deltaY < 0 ? zoomIn() : zoomOut();
    });

    document.getElementById('lightbox').addEventListener('click', e => {
        if (e.target === document.getElementById('lightbox')) closeLightbox();
    });
</script>
</body>
</html>
    `;
}

function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (['.jpg','.jpeg','.png','.gif','.webp','.bmp','.svg','.ico','.tiff','.tif','.avif','.apng','.heic','.heif','.HEIC'].includes(ext)) return 'image';
    if (['.mp4','.webm','.ogg','.mov','.avi','.mkv'].includes(ext)) return 'video';
    if (['.pdf'].includes(ext)) return 'pdf';
    if (['.doc','.docx'].includes(ext)) return 'doc';
    return 'other';
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

module.exports = { generateGalleryHTML };
