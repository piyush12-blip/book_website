const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, 'public', 'script.js');
let content = fs.readFileSync(scriptPath, 'utf8');

// Update function signature and add URL formatters
content = content.replace(
  /function getBackdoorMirrorsHTML\(title, genre = '', format = '', id = ''\) {([\s\S]*?)const isManga =/g,
  `function getBackdoorMirrorsHTML(title, genre = '', format = '', id = '') {
  const cleanTitle = (title || '').replace(/^\\d+\\s*/, '').trim();
  const encodedTitle = encodeURIComponent(cleanTitle);
  const plusTitle = cleanTitle.replace(/\\s+/g, '+').toLowerCase();
  const underscoreTitle = cleanTitle.replace(/\\s+/g, '_').toLowerCase();
  const t = cleanTitle.toLowerCase();
  const g = (genre || '').toLowerCase();
  const f = (format || '').toLowerCase();

  const isManga =`
);

// Fix MangaNato (use underscoreTitle)
content = content.replace(
  /href="https:\/\/manganato\.com\/search\/story\/\$\{encodedTitle\}"/g,
  `href="https://manganato.com/search/story/\${underscoreTitle}"`
);

// Fix Anna's Archive (use .org and plusTitle)
content = content.replace(
  /href="https:\/\/annas-archive\.li\/search\?q=\$\{encodedTitle\}/g,
  `href="https://annas-archive.org/search?q=\${plusTitle}`
);

// Fix NovelBin (use .com)
content = content.replace(
  /href="https:\/\/novelbin\.me\/search\?keyword=\$\{encodedTitle\}"/g,
  `href="https://novelbin.com/search?keyword=\${encodedTitle}"`
);

// Fix FreeWebNovel and J-Novels -> replace with LightNovelPub & Ranobes
content = content.replace(
  /<a href="https:\/\/freewebnovel\.com\/search\.html\?key=\$\{encodedTitle\}"[\s\S]*?<\/a>/g,
  `<a href="https://www.lightnovelpub.com/search?keyword=\${encodedTitle}" target="_blank" rel="noopener" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #1d4ed8;display:block;font-weight:600;transition:all 0.2s;">📖 Mirror 2: LightNovelPub Full Text Archive</a>`
);

content = content.replace(
  /<a href="https:\/\/j-novels\.com\/\?s=\$\{encodedTitle\}"[\s\S]*?<\/a>/g,
  `<a href="https://ranobes.top/search/\${plusTitle}" target="_blank" rel="noopener" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 16px;border-radius:6px;font-size:0.9rem;border:1px solid #0d9488;display:block;font-weight:600;">📦 Mirror 3: Ranobes Direct Archive</a>`
);

// Fix OceanOfPDF (use plusTitle)
content = content.replace(
  /href="https:\/\/oceanofpdf\.com\/\?s=\$\{encodedTitle\}"/g,
  `href="https://oceanofpdf.com/?s=\${plusTitle}"`
);

// Fix LibGen (use plusTitle)
content = content.replace(
  /href="https:\/\/libgen\.is\/fiction\/\?q=\$\{encodedTitle\}"/g,
  `href="https://libgen.is/fiction/?q=\${plusTitle}"`
);

fs.writeFileSync(scriptPath, content, 'utf8');
console.log('Fixed URLs successfully!');
