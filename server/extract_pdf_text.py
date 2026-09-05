import sys
import os
import json
import re
import html

try:
    import fitz  # PyMuPDF
except ImportError:
    print(json.dumps({"error": "PyMuPDF (fitz) is not installed"}))
    sys.exit(1)

def clean_paragraph_text(raw_text):
    """Clean and normalize paragraph text, remove soft hyphens and wrap in <p>."""
    if not raw_text:
        return ""
    
    # Normalize newlines
    lines = [line.rstrip() for line in raw_text.splitlines()]
    
    paragraphs = []
    current_para = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_para:
                para_text = " ".join(current_para)
                # Fix hyphenated line breaks e.g. "com- / puter" -> "computer"
                para_text = re.sub(r'(\b\w+)-\s+(\w+\b)', r'\1\2', para_text)
                paragraphs.append(para_text)
                current_para = []
        else:
            # Check if this line looks like a header/footer or isolated page number
            if re.match(r'^\d+$', stripped) and len(stripped) <= 4:
                continue # Skip page number
            current_para.append(stripped)
            
    if current_para:
        para_text = " ".join(current_para)
        para_text = re.sub(r'(\b\w+)-\s+(\w+\b)', r'\1\2', para_text)
        paragraphs.append(para_text)
        
    html_paras = []
    for p in paragraphs:
        escaped = html.escape(p)
        if escaped:
            html_paras.append(f"<p>{escaped}</p>")
            
    return "\n".join(html_paras)

def is_front_matter_text(title_str, text_str):
    t_lower = (title_str or "").strip().lower()
    clean = (text_str or "").strip().lower()
    
    # 1. Promotional pages
    if "oceanofpdf.com" in clean or "oceanofpdf" in t_lower or "annas-archive" in clean:
        if len(clean) < 3500:
            return True
            
    # 2. Cover / Title / Imprint
    if t_lower in ["cover", "title page", "title", "half title", "imprint", "halftitle"]:
        return True
        
    # 3. Copyright & legal
    if t_lower in ["copyright", "legal notices"] or ("all rights reserved" in clean and len(clean) < 3000):
        return True
        
    # 4. Table of Contents
    if t_lower in ["contents", "table of contents", "toc"]:
        return True
        
    # 5. Dedication / Epigraph
    if t_lower in ["dedication", "epigraph"] and len(clean) < 1200:
        return True
        
    # 6. Praise / Blurbs
    if ("praise for" in clean or "advance praise" in clean or "also by this author" in clean) and len(clean) < 2000:
        return True
        
    return False

def extract_pdf_chapters(pdf_path):
    if not os.path.exists(pdf_path):
        return {"error": f"File not found: {pdf_path}"}
        
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        return {"error": f"Failed to open PDF: {str(e)}"}
        
    total_pages = len(doc)
    if total_pages == 0:
        return {"error": "PDF has 0 pages"}
        
    # 1. Try extracting Table of Contents (TOC)
    try:
        toc = doc.get_toc()
    except Exception:
        toc = []
        
    chapters = []
    
    # Filter TOC to valid level 1 or 2 entries
    valid_toc = []
    for item in toc:
        # item format: [lvl, title, page_number (1-indexed), ...]
        if len(item) >= 3 and item[2] > 0 and item[2] <= total_pages:
            t_str = item[1].strip()
            # Filter out obvious front-matter titles
            if not is_front_matter_text(t_str, ""):
                valid_toc.append({"lvl": item[0], "title": t_str, "page": item[2] - 1})
            
    if len(valid_toc) >= 2:
        # Sort by page
        valid_toc.sort(key=lambda x: x["page"])
        
        # Deduplicate entries on same page with same title
        unique_toc = []
        for item in valid_toc:
            if not unique_toc or unique_toc[-1]["page"] != item["page"] or unique_toc[-1]["title"] != item["title"]:
                unique_toc.append(item)
                
        for i, item in enumerate(unique_toc):
            start_p = item["page"]
            end_p = unique_toc[i + 1]["page"] if (i + 1) < len(unique_toc) else total_pages
            
            # Extract text for these pages
            ch_texts = []
            for p_num in range(start_p, min(end_p, total_pages)):
                page_text = doc[p_num].get_text("text")
                if page_text and len(page_text.strip()) > 20:
                    ch_texts.append(page_text)
                    
            full_text = "\n\n".join(ch_texts)
            
            # Skip if the actual text of this section is front-matter / copyright / promo
            if is_front_matter_text(item["title"], full_text):
                continue

            ch_html = clean_paragraph_text(full_text)
            
            if ch_html.strip():
                clean_title = item["title"]
                clean_title = re.sub(r'[\.\s_]+(?:\d+)$', '', clean_title).strip()
                chapters.append({
                    "title": clean_title or f"Chapter {len(chapters) + 1}",
                    "html": ch_html,
                    "pages": f"{start_p + 1} - {end_p}"
                })
                
    # 2. If no valid TOC, scan for chapter headings
    if not chapters:
        current_ch_title = None
        current_ch_pages = []
        
        chapter_regex = re.compile(
            r'^\s*(?:CHAPTER|Chapter|CH\.|BOOK|Book|PART|Part|ACT|Act|LESSON|Lesson|LAW|Law)\s+([0-9IVXLCDM]+|[A-Za-z]+)?(?:\s*[:\-\u2014]\s*(.+))?',
            re.IGNORECASE
        )
        
        for p_num in range(total_pages):
            p_text = doc[p_num].get_text("text")
            lines = [l.strip() for l in p_text.splitlines() if l.strip()]
            
            found_title = None
            for line in lines[:5]:
                m = chapter_regex.match(line)
                if m and len(line) < 80:
                    found_title = line
                    break
                    
            if found_title:
                if current_ch_pages and current_ch_title:
                    full_text = "\n\n".join(current_ch_pages)
                    if not is_front_matter_text(current_ch_title, full_text):
                        ch_html = clean_paragraph_text(full_text)
                        if ch_html.strip():
                            chapters.append({
                                "title": current_ch_title,
                                "html": ch_html
                            })
                current_ch_title = found_title
                current_ch_pages = [p_text]
            else:
                if current_ch_title is not None:
                    current_ch_pages.append(p_text)
                else:
                    # If we haven't hit chapter 1 yet, only record if it looks like genuine story prologue
                    if len(p_text.strip()) > 300 and not is_front_matter_text("", p_text):
                        current_ch_title = "Prologue"
                        current_ch_pages.append(p_text)
                
        if current_ch_pages and current_ch_title:
            full_text = "\n\n".join(current_ch_pages)
            if not is_front_matter_text(current_ch_title, full_text):
                ch_html = clean_paragraph_text(full_text)
                if ch_html.strip():
                    chapters.append({
                        "title": current_ch_title,
                        "html": ch_html
                    })
                
    # 3. If still only 1 big chapter or none, split by page chunks (e.g. 5-8 pages each)
    if len(chapters) <= 1 and total_pages > 8:
        chunk_size = 5 if total_pages <= 50 else (10 if total_pages <= 200 else 15)
        chunked_chapters = []
        
        for start_p in range(0, total_pages, chunk_size):
            end_p = min(start_p + chunk_size, total_pages)
            chunk_texts = []
            for p_num in range(start_p, end_p):
                pt = doc[p_num].get_text("text")
                if pt and pt.strip():
                    chunk_texts.append(pt)
                    
            full_text = "\n\n".join(chunk_texts)
            ch_html = clean_paragraph_text(full_text)
            if ch_html.strip():
                chunked_chapters.append({
                    "title": f"Pages {start_p + 1} – {end_p}",
                    "html": ch_html
                })
        if chunked_chapters:
            chapters = chunked_chapters
            
    has_text = any(len(c.get("html", "")) > 50 for c in chapters)
    if not has_text:
        return {
            "error": "No selectable text found in this PDF (it may contain scanned image pages).",
            "is_scanned": True,
            "page_count": total_pages
        }
        
    return {
        "success": True,
        "page_count": total_pages,
        "chapter_count": len(chapters),
        "chapters": chapters
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python extract_pdf_text.py <pdf_path>"}))
        sys.exit(1)
        
    pdf_file = sys.argv[1]
    result = extract_pdf_chapters(pdf_file)
    print(json.dumps(result))
