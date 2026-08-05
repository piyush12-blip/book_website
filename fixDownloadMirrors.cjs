const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, 'public', 'script.js');
let content = fs.readFileSync(scriptPath, 'utf8');

// Replace Manga section in getBackdoorMirrorsHTML with DIRECT DOWNLOAD SOURCES (CBZ/CBR/PDF/EPUB)
const newMangaBlock = `  if (isManga) {
    return \`
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="https://archive.org/search.php?query=\${basePlus}+manga" target="_blank" rel="noopener" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #1d4ed8;display:block;font-weight:600;transition:all 0.2s;">
          📦 Mirror 1: Internet Archive (Direct CBZ / PDF Manga Vault)
        </a>
        <a href="https://annas-archive.org/search?q=\${basePlus}+cbz" target="_blank" rel="noopener" style="background:#0369a1;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #0284c7;display:block;font-weight:600;">
          🏴‍☠️ Mirror 2: Anna's Archive (Direct CBR / CBZ Manga Download)
        </a>
        <a href="https://nyaa.si/?f=0&c=3_1&q=\${basePlus}" target="_blank" rel="noopener" style="background:#059669;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #047857;display:block;font-weight:600;">
          ⚡ Mirror 3: Nyaa Manga Archive (Complete CBZ / Volume Packs)
        </a>
        <a href="https://www.google.com/search?q=\${basePlus}+manga+download+cbz+pdf" target="_blank" rel="noopener" style="background:#475569;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #334155;display:block;font-weight:600;">
          🔍 Mirror 4: Google Direct CBZ / PDF Download Search
        </a>
      </div>
    \`;
  }`;

content = content.replace(/if \(isManga\) \{[\s\S]*?\} else if \(isWebNovel\)/, newMangaBlock + ' else if (isWebNovel)');

fs.writeFileSync(scriptPath, content, 'utf8');
console.log('Updated script.js to prioritize DIRECT DOWNLOAD SOURCES (CBZ/CBR/PDF/EPUB)!');
