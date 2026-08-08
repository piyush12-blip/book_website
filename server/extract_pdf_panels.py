import fitz # PyMuPDF
import os
import glob

DOWNLOADS_DIR = r"C:\Users\PRINTER SERVICE\Downloads"
OUTPUT_BASE = r"C:\Users\PRINTER SERVICE\.gemini\antigravity\scratch\book_website\public\manga_storage\god_level_assassin"

os.makedirs(OUTPUT_BASE, exist_ok=True)

pdf_files = glob.glob(os.path.join(DOWNLOADS_DIR, "*God-level*.pdf"))
print(f"Found {len(pdf_files)} PDF files in Downloads:")

for pdf_path in pdf_files:
    fname = os.path.basename(pdf_path)
    print(f"\nProcessing: {fname}")
    doc = fitz.open(pdf_path)
    print(f"Total pages: {len(doc)}")
    
    # Determine chapter folder
    ch_num = "0"
    if "133" in fname:
        ch_num = "133"
    elif "000" in fname or "Ch-0" in fname:
        ch_num = "0"
    
    ch_dir = os.path.join(OUTPUT_BASE, f"chapter_{ch_num}")
    os.makedirs(ch_dir, exist_ok=True)
    
    # Render all pages as high-resolution images
    for i, page in enumerate(doc):
        # 2x zoom for crisp HD webtoon rendering
        zoom = 2.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        out_file = os.path.join(ch_dir, f"page_{i+1:03d}.jpg")
        pix.save(out_file)
        print(f"Saved: {out_file} ({pix.width}x{pix.height})")
    
    # If this is chapter 0, copy as chapter 1 as well so Chapter 1 has the real panels
    if ch_num == "0":
        ch1_dir = os.path.join(OUTPUT_BASE, "chapter_1")
        os.makedirs(ch1_dir, exist_ok=True)
        for i, page in enumerate(doc):
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            pix.save(os.path.join(ch1_dir, f"page_{i+1:03d}.jpg"))
        print(f"Also cloned as chapter_1 panels!")

print("\nAll comic pages extracted successfully!")
