import fitz
import os
import sys

def extract_pdf(pdf_path, out_dir):
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF not found: {pdf_path}")
            return 0

        os.makedirs(out_dir, exist_ok=True)
        doc = fitz.open(pdf_path)
        count = 0

        for i, page in enumerate(doc):
            images = page.get_images()
            extracted = False

            if images:
                for img_info in images:
                    xref = img_info[0]
                    base_img = doc.extract_image(xref)
                    if base_img and base_img.get("image") and len(base_img["image"]) > 2000:
                        ext = base_img.get("ext", "jpg")
                        out_file = os.path.join(out_dir, f"page_{i+1:03d}.{ext}")
                        with open(out_file, "wb") as f:
                            f.write(base_img["image"])
                        extracted = True
                        count += 1
                        break

            if not extracted:
                pix = page.get_pixmap(dpi=150, alpha=False)
                out_file = os.path.join(out_dir, f"page_{i+1:03d}.jpg")
                pix.save(out_file)
                count += 1

        print(f"SUCCESS:{count}")
        return count
    except Exception as e:
        print(f"ERROR:{e}", file=sys.stderr)
        return 0

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_pdf.py <pdf_path> <out_dir>")
        sys.exit(1)

    extract_pdf(sys.argv[1], sys.argv[2])
