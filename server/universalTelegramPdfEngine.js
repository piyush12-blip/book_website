const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DOWNLOADS_DIR = 'C:\\Users\\PRINTER SERVICE\\Downloads';
const STORAGE_ROOT = path.join(__dirname, '../public/manga_storage');
const PUBLIC_ROOT = '/manga_storage';

// Ensure storage root exists
if (!fs.existsSync(STORAGE_ROOT)) {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

// Clean and normalize book titles for matching
function normalizeTitle(str) {
    return (str || '')
        .toLowerCase()
        .replace(/\[ch[\-\s]?\d+\]/gi, '')
        .replace(/\[c\d+\]/gi, '')
        .replace(/\[@manga_cruise[^\]]*\]/gi, '')
        .replace(/\(\d+\)/g, '')
        .replace(/manga|manhwa|manhua|webtoon/gi, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function parsePdfFilename(filename) {
    const clean = filename.replace(/\.pdf$/i, '');
    let chapterNum = null;
    let title = clean;

    // Pattern 1: [Ch-000] Title [@Manga_Cruise]
    const chPrefixMatch = clean.match(/\[(?:Ch|c|Chapter)[\-\s]?(\d+)\]\s*([^\[]+)/i);
    if (chPrefixMatch) {
        chapterNum = parseInt(chPrefixMatch[1], 10);
        title = chPrefixMatch[2]
            .replace(/\[@Manga_Cruise[^\]]*\]/gi, '')
            .replace(/\(\d+\)/g, '')
            .trim();
    } else {
        // Pattern 2: Title [Ch-000]
        const chSuffixMatch = clean.match(/(.+?)\s*\[(?:Ch|c|Chapter)[\-\s]?(\d+)\]/i);
        if (chSuffixMatch) {
            title = chSuffixMatch[1].trim();
            chapterNum = parseInt(chSuffixMatch[2], 10);
        } else {
            // Pattern 3: Title Chapter 123
            const chWordMatch = clean.match(/(.+?)\s*(?:Chapter|Ch)\s*(\d+)/i);
            if (chWordMatch) {
                title = chWordMatch[1].trim();
                chapterNum = parseInt(chWordMatch[2], 10);
            }
        }
    }

    if (chapterNum === null) chapterNum = 1;
    const slug = normalizeTitle(title);

    return { title, chapterNum, slug, filename };
}

// Index all Telegram manga PDFs found in Downloads
function scanDownloadedMangaPdfs() {
    if (!fs.existsSync(DOWNLOADS_DIR)) return [];
    try {
        const files = fs.readdirSync(DOWNLOADS_DIR).filter(f => /\.pdf$/i.test(f));
        const pdfs = [];

        for (const f of files) {
            // Ignore non-manga documents
            if (/tender|marksheet|admitcard|cgpet|neet|confirmation/i.test(f)) continue;

            const parsed = parsePdfFilename(f);
            if (parsed.slug.length >= 2) {
                pdfs.push({
                    ...parsed,
                    fullPath: path.join(DOWNLOADS_DIR, f)
                });
            }
        }
        return pdfs;
    } catch (e) {
        console.error('[PDF ENGINE] Error scanning downloads:', e.message);
        return [];
    }
}

// Extract PDF pages into public/manga_storage using PyMuPDF (fitz)
function extractPdfToImages(pdfPath, targetDir) {
    return new Promise((resolve) => {
        if (fs.existsSync(targetDir)) {
            const existing = fs.readdirSync(targetDir).filter(f => /\.(jpg|png|webp)$/i.test(f) && fs.statSync(path.join(targetDir, f)).size > 1000);
            if (existing.length > 0) {
                return resolve(existing);
            }
        }

        fs.mkdirSync(targetDir, { recursive: true });

        const pyScript = `
import fitz, os, sys
doc = fitz.open(sys.argv[1])
out_dir = sys.argv[2]
for i, page in enumerate(doc):
    mat = fitz.Matrix(2.0, 2.0)
    pix = page.get_pixmap(matrix=mat)
    pix.save(os.path.join(out_dir, f"page_{i+1:03d}.jpg"))
print(f"EXTRACTED:{len(doc)}")
`;

        const tempScriptPath = path.join(__dirname, '_temp_extract.py');
        fs.writeFileSync(tempScriptPath, pyScript, 'utf8');

        exec(`python "${tempScriptPath}" "${pdfPath}" "${targetDir}"`, { timeout: 30000 }, (err, stdout) => {
            try { fs.unlinkSync(tempScriptPath); } catch {}
            if (err) {
                console.error('[PDF ENGINE] Extraction error:', err.message);
                return resolve([]);
            }
            const files = fs.readdirSync(targetDir).filter(f => /\.(jpg|png|webp)$/i.test(f));
            console.log(`[PDF ENGINE] Extracted ${files.length} comic pages to ${targetDir}`);
            resolve(files);
        });
    });
}

// Build universal comic panel HTML
function formatComicHtml(chNum, totalCh, title, images, slug) {
    const panels = images.map((img, idx) => `
        <div class="manga-panel-page" style="text-align:center;margin:0;padding:0;line-height:0;background:#000;width:100%;">
            <img 
                src="${PUBLIC_ROOT}/${slug}/chapter_${chNum}/${img}" 
                alt="${title} - Page ${idx + 1}" 
                loading="lazy"
                decoding="async"
                style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;border:none;"
            >
        </div>
    `).join('');

    return `
        <div class="manhwa-chapter-container" id="chapter-container-${chNum}" style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;">
            <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:30;box-shadow:0 4px 25px rgba(0,0,0,0.9);">
                <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                    OFFICIAL MANHWA COMIC • CHAPTER ${chNum}
                </div>
                <h2 style="color:#f8fafc;font-size:1.5rem;margin:0;font-weight:800;">
                    ${title} — Chapter ${chNum}
                </h2>
                <span style="color:#64748b;font-size:0.8rem;margin-top:0.25rem;display:inline-block;">
                    ${images.length} Full HD Comic Pages
                </span>
            </div>

            <div class="manhwa-strip-body" style="display:flex;flex-direction:column;align-items:center;background:#000;gap:0;padding:0;margin:0;width:100%;">
                ${panels}
            </div>

            <div style="background:#0a0e17;padding:2.5rem 1.5rem;text-align:center;border-top:1px solid #1e293b;margin-top:2rem;">
                <p style="color:#94a3b8;font-size:0.95rem;margin:0 0 1.25rem 0;">
                    ✓ Finished reading <strong>Chapter ${chNum}</strong>
                </p>
                <div style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap;">
                    <a href="https://t.me/Manga_Cruise_Updates" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:0.95rem;">
                        📱 Telegram Channel ➔
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Master resolver: Get real panels for ANY title from Telegram PDFs
async function getUniversalTelegramPanels(queryTitle, targetChapterNum = 1) {
    const querySlug = normalizeTitle(queryTitle);
    if (!querySlug) return null;

    const allPdfs = scanDownloadedMangaPdfs();
    if (allPdfs.length === 0) return null;

    // Find best matching PDF
    let matchingPdfs = allPdfs.filter(p => querySlug.includes(p.slug) || p.slug.includes(querySlug));
    
    // If not exact, try word token overlap
    if (matchingPdfs.length === 0) {
        const qWords = queryTitle.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
        matchingPdfs = allPdfs.filter(p => {
            const pWords = p.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
            const matches = qWords.filter(qw => pWords.some(pw => pw.includes(qw) || qw.includes(pw)));
            return matches.length >= 2 || (qWords.length === 1 && matches.length === 1);
        });
    }

    if (matchingPdfs.length === 0) return null;

    // Determine target PDF strictly for the requested chapter
    let bestPdf = matchingPdfs.find(p => p.chapterNum === targetChapterNum);
    if (!bestPdf && targetChapterNum === 1) {
        bestPdf = matchingPdfs.find(p => p.chapterNum === 0);
    }
    if (!bestPdf) {
        // Do NOT borrow another chapter's pages
        return null;
    }

    const slug = bestPdf.slug;
    const targetDir = path.join(STORAGE_ROOT, slug, `chapter_${targetChapterNum}`);
    
    // Extract pages to storage
    const images = await extractPdfToImages(bestPdf.fullPath, targetDir);
    if (images.length === 0) return null;

    return formatComicHtml(targetChapterNum, matchingPdfs.length, bestPdf.title, images, slug);
}

// Universal Chapter Builder for ANY manga series from Telegram
async function buildUniversalTelegramChapters(queryTitle, totalChapters = 284) {
    const querySlug = normalizeTitle(queryTitle);
    const allPdfs = scanDownloadedMangaPdfs();
    const matchingPdfs = allPdfs.filter(p => querySlug.includes(p.slug) || p.slug.includes(querySlug));

    const isAssassin = querySlug.includes('assassin') || querySlug.includes('shadow');
    const total = isAssassin ? 133 : Math.max(totalChapters, matchingPdfs.length);
    const chapters = [];

    // Pre-load chapter 1 panels
    const ch1Html = await getUniversalTelegramPanels(queryTitle, 1);

    for (let i = 1; i <= total; i++) {
        // If we have extracted images for this chapter already, build full HTML immediately
        let html = (i === 1 && ch1Html) ? ch1Html : null;

        if (!html) {
            const chDir = path.join(STORAGE_ROOT, querySlug, `chapter_${i}`);
            if (fs.existsSync(chDir)) {
                const images = fs.readdirSync(chDir).filter(f => /\.(jpg|png|webp)$/i.test(f) && fs.statSync(path.join(chDir, f)).size > 1000);
                if (images.length > 0) {
                    html = formatComicHtml(i, total, queryTitle, images, querySlug);
                }
            }
        }

        // For ALL series: NEVER borrow panels from chapter 1 for missing chapters.
        // If local panels exist for chapter_i, show them. Otherwise show Telegram redirect.

        // No local panels — show Telegram link
        if (!html) {
            html = `
                <div style="max-width:750px;margin:4rem auto;padding:2.5rem;background:#0d1117;border:1px solid #21262d;border-radius:16px;color:#e6edf3;text-align:center;">
                    <div style="background:#0284c7;color:#fff;padding:5px 16px;border-radius:20px;font-size:0.8rem;font-weight:800;display:inline-block;margin-bottom:1.2rem;">
                        CHAPTER ${i} OF ${total}
                    </div>
                    <h2 style="color:#f8fafc;margin:0 0 0.6rem 0;">${queryTitle}</h2>
                    <p style="color:#8b949e;margin:0 0 2rem 0;">Chapter ${i} is hosted on the official Telegram channel in full HD.</p>
                    <a href="https://t.me/Manga_Cruise_Updates" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:1rem;">
                        📱 Read Chapter ${i} on Telegram ➔
                    </a>
                </div>`;
        }

        chapters.push({
            title: `Chapter ${i}`,
            chapterId: `tg-ch-${i}-${encodeURIComponent(queryTitle)}`,
            html,
            _chNum: i,
            _title: queryTitle
        });
    }

    return chapters;
}

module.exports = {
    scanDownloadedMangaPdfs,
    getUniversalTelegramPanels,
    buildUniversalTelegramChapters,
    normalizeTitle
};
