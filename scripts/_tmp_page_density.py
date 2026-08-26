import pymupdf
from pathlib import Path

pdf = Path("public/downloads/blueprint/the-back-half-blueprint.pdf")
doc = pymupdf.open(pdf)
print("pages", doc.page_count)
for i, page in enumerate(doc):
    text = page.get_text("text").strip()
    lines = [ln for ln in text.splitlines() if ln.strip()]
    head = lines[0][:70] if lines else "(blank)"
    print(f"{i+1:02d} chars={len(text):4d} lines={len(lines):2d} | {head}")
