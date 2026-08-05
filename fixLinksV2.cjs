const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, 'public', 'script.js');
let content = fs.readFileSync(scriptPath, 'utf8');

// 1. Pass chapter number (idx + 1) in renderReader
content = content.replace(
  /\$\{getBackdoorMirrorsHTML\(b\.title,\s*b\.genre,\s*b\.format,\s*b\.id\)\}/g,
  '${getBackdoorMirrorsHTML(b.title, b.genre, b.format, b.id, (idx + 1))}'
);

// 2. Replace getBackdoorMirrorsHTML implementation
const newFunc = `function getBackdoorMirrorsHTML(title, genre = '', format = '', id = '', chapterNum = 0) {
  const cleanTitle = (title || '').replace(/^\\d+\\s*/, '').trim();
  const chStr = chapterNum > 0 ? \` Chapter \${chapterNum}\` : '';
  
  const fullTitle = cleanTitle + chStr;
  const encodedTitle = encodeURIComponent(fullTitle);
  const plusTitle = fullTitle.replace(/\\s+/g, '+').toLowerCase();
  const underscoreTitle = fullTitle.replace(/\\s+/g, '_').toLowerCase();
  const dashTitle = fullTitle.replace(/\\s+/g, '-').toLowerCase();

  const basePlus = cleanTitle.replace(/\\s+/g, '+').toLowerCase();
  const baseEncoded = encodeURIComponent(cleanTitle);

  const t = cleanTitle.toLowerCase();
  const g = (genre || '').toLowerCase();
  const f = (format || '').toLowerCase();

  const isManga = id.startsWith('mangadex-') || g.includes('manga') || f.includes('manga') || t.includes('manhwa') || t.includes('manhua') || t.includes('comic');
  const isWebNovel = !isManga && [
    'sss', 'system', 'reincarnation', 'goddess', 'leveling', 'rank', 'cultivation', 
    'beast', 'yandere', 'konoha', 'hogwarts', 'scumbag', 'pornstar', 'transmigrat', 
    'light novel', 'web novel', 'royal road'
  ].some(kw => t.includes(kw) || g.includes(kw) || f.includes(kw));

  if (isManga) {
    return \`
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="https://manganato.com/advanced_search?story_type=all&keyword=\${baseEncoded}" target="_blank" rel="noopener" style="background:#ea580c;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #c2410c;display:block;font-weight:600;transition:all 0.2s;">
          📖 Mirror 1: MangaNato Full Archive\${chStr ? ' (Chapter ' + chapterNum + ')' : ''}
        </a>
        <a href="https://comick.io/search?q=\${encodedTitle}" target="_blank" rel="noopener" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #1d4ed8;display:block;font-weight:600;">
          ⚡ Mirror 2: ComicK Global Reader\${chStr ? ' (\${chapterNum})' : ''}
        </a>
        <a href="https://mangafire.to/filter?keyword=\${encodedTitle}" target="_blank" rel="noopener" style="background:#059669;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #047857;display:block;font-weight:600;">
          🔥 Mirror 3: MangaFire Reader Archive
        </a>
        <a href="https://www.google.com/search?q=\${plusTitle}+manga+read+online" target="_blank" rel="noopener" style="background:#475569;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #334155;display:block;font-weight:600;">
          🔍 Mirror 4: Google Direct Chapter Search
        </a>
      </div>
    \`;
  } else if (isWebNovel) {
    return \`
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="https://novelbin.com/search?keyword=\${encodedTitle}" target="_blank" rel="noopener" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #6d28d9;display:block;font-weight:600;transition:all 0.2s;">
          ⚡ Mirror 1: NovelBin Mirror\${chStr ? ' (Chapter ' + chapterNum + ')' : ''}
        </a>
        <a href="https://www.lightnovelpub.com/search?keyword=\${encodedTitle}" target="_blank" rel="noopener" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #1d4ed8;display:block;font-weight:600;transition:all 0.2s;">
          📖 Mirror 2: LightNovelPub Archive
        </a>
        <a href="https://ranobes.top/search/\${plusTitle}" target="_blank" rel="noopener" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #0d9488;display:block;font-weight:600;">
          📦 Mirror 3: Ranobes Direct Archive
        </a>
        <a href="https://www.google.com/search?q=\${plusTitle}+webnovel+read+online" target="_blank" rel="noopener" style="background:#475569;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #334155;display:block;font-weight:600;">
          🔍 Mirror 4: Google Direct WebNovel Search
        </a>
      </div>
    \`;
  } else {
    return \`
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a href="https://oceanofpdf.com/?s=\${basePlus}" target="_blank" rel="noopener" style="background:#0369a1;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #0284c7;display:block;font-weight:600;">
          🌊 Mirror 1: OceanofPDF (Direct EPUB Download)
        </a>
        <a href="http://libgen.is/search.php?req=\${baseEncoded}" target="_blank" rel="noopener" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #0d9488;display:block;font-weight:600;">
          🏛️ Mirror 2: Library Genesis (LibGen)
        </a>
        <a href="https://www.google.com/search?q=\${basePlus}+epub+pdf+download" target="_blank" rel="noopener" style="background:#475569;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #334155;display:block;font-weight:600;">
          🔍 Mirror 3: Google Direct EPUB/PDF Search
        </a>
      </div>
    \`;
  }
}`;

content = content.replace(/function getBackdoorMirrorsHTML[\s\S]*?^}/m, newFunc);

fs.writeFileSync(scriptPath, content, 'utf8');
console.log('Successfully updated script.js with working mirrors and chapter targeting!');
