const fs = require('fs');
const path = require('path');

const STORAGE_ROOT = path.join(__dirname, '../public/manga_storage/god_level_assassin');
const PUBLIC_ROOT = '/manga_storage/god_level_assassin';

// Returns the real panel images for a SPECIFIC chapter folder only.
// Does NOT bleed panels from one chapter into another.
function getChapterImages(chNum) {
    const chDir = path.join(STORAGE_ROOT, `chapter_${chNum}`);
    if (!fs.existsSync(chDir)) return { files: [], dir: `chapter_${chNum}` };
    const files = fs.readdirSync(chDir)
        .filter(f => {
            if (!/\.(jpg|png|webp|jpeg)$/i.test(f)) return false;
            try { return fs.statSync(path.join(chDir, f)).size > 1000; } catch { return false; }
        })
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return { files, dir: `chapter_${chNum}` };
}

// Build the vertical comic strip HTML for a chapter that has real images
function buildPanelHtml(chNum, files, usedDir, title) {
    const panelImgs = files.map((file, idx) => {
        const url = `${PUBLIC_ROOT}/${usedDir}/${file}`;
        return `<div style="text-align:center;margin:0;padding:0;line-height:0;background:#000;width:100%;">
            <img src="${url}" alt="${title} - Ch${chNum} Page ${idx + 1}" loading="lazy" decoding="async"
                 style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;border:none;">
        </div>`;
    });

    return `
        <div style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;">
            <div style="background:#0a0e17;padding:1rem 1.25rem;text-align:center;border-bottom:1px solid #1e293b;position:relative;box-shadow:0 4px 20px rgba(0,0,0,0.5);margin-bottom:0.5rem;">
                <div style="display:inline-block;background:#0284c7;color:#fff;padding:3px 12px;border-radius:10px;font-size:0.72rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.3rem;">
                    OFFICIAL MANHWA • CHAPTER ${chNum}
                </div>
                <h2 style="color:#f8fafc;font-size:1.2rem;margin:0.25rem 0 0 0;font-weight:800;">${title}</h2>
                <span style="color:#64748b;font-size:0.75rem;">${files.length} Full HD Pages</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;background:#000;gap:0;padding:0;margin:0;width:100%;">
                ${panelImgs.join('\n')}
            </div>
            <div style="background:#0a0e17;padding:2.5rem 1.5rem;text-align:center;border-top:1px solid #1e293b;margin-top:2rem;">
                <p style="color:#94a3b8;font-size:0.95rem;margin:0 0 1.25rem 0;">
                    ✓ Finished reading <strong>Chapter ${chNum}</strong>
                </p>
                <a href="https://t.me/God_level_Assassin_Im_the_Shado" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:0.95rem;">
                    📱 Open Telegram for Next Chapters ➔
                </a>
            </div>
        </div>`;
}

// Build the "read on Telegram" placeholder for chapters without local PDFs
function buildTelegramLinkHtml(chNum, title) {
    return `
        <div style="max-width:750px;margin:4rem auto;padding:2.5rem;background:#0d1117;border:1px solid #21262d;border-radius:16px;color:#e6edf3;text-align:center;">
            <div style="background:#0284c7;color:#fff;padding:5px 16px;border-radius:20px;font-size:0.8rem;font-weight:800;display:inline-block;margin-bottom:1.2rem;">
                CHAPTER ${chNum} OF 133
            </div>
            <h2 style="color:#f8fafc;margin:0 0 0.6rem 0;font-size:1.5rem;">${title}</h2>
            <p style="color:#8b949e;margin:0 0 0.5rem 0;font-size:0.95rem;">
                📥 Chapter ${chNum} is hosted on the official Telegram channel.
            </p>
            <p style="color:#64748b;margin:0 0 2rem 0;font-size:0.85rem;">
                Only Ch.0 (Prologue), Ch.1, and Ch.133 are locally extracted. Download more chapters from Telegram to read inline.
            </p>
            <a href="https://t.me/God_level_Assassin_Im_the_Shado" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:1rem;letter-spacing:0.3px;">
                📱 Read Chapter ${chNum} on Telegram ➔
            </a>
        </div>`;
}

// Main function: builds full chapter list (0–133)
function getGodLevelAssassinChapters(totalChapters = 133) {
    const title = "God-level Assassin, I'm the Shadow";
    const chapters = [];

    // Chapter 0 (Prologue) — check if extracted
    const ch0 = getChapterImages(0);
    if (ch0.files.length > 0) {
        chapters.push({
            title: 'Prologue (Ch.0)',
            chapterId: 'tg-ch-0-GodLevelAssassin',
            html: buildPanelHtml(0, ch0.files, ch0.dir, title)
        });
    }

    for (let i = 1; i <= totalChapters; i++) {
        const { files, dir } = getChapterImages(i);
        chapters.push({
            title: `Chapter ${i}`,
            chapterId: `tg-ch-${i}-GodLevelAssassinImTheShadow`,
            html: files.length > 0
                ? buildPanelHtml(i, files, dir, title)
                : buildTelegramLinkHtml(i, title)
        });
    }

    return chapters;
}

function getGodLevelAssassinChapter(chNum) {
    const title = "God-level Assassin, I'm the Shadow";
    const { files, dir } = getChapterImages(chNum);
    if (files.length > 0) return buildPanelHtml(chNum, files, dir, title);
    return buildTelegramLinkHtml(chNum, title);
}

module.exports = { getGodLevelAssassinChapters, getGodLevelAssassinChapter };
