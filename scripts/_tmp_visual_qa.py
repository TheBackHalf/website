"""Render every Blueprint page and score leftover cream space."""
from pathlib import Path
import json
import pymupdf

root = Path(r"C:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\Launch\04 Website\website")
pdf = root / "public/downloads/blueprint/the-back-half-blueprint.pdf"
out = root / "tmp/row51-qa"
out.mkdir(parents=True, exist_ok=True)

doc = pymupdf.open(pdf)
print("pages", doc.page_count, "bytes", pdf.stat().st_size)
print("outline", bool(doc.get_toc()), "toc_count", len(doc.get_toc()))

# cream-ish empty detector in lower 38% of page, excluding footer band
rows = []
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=pymupdf.Matrix(1.35, 1.35), alpha=False)
    png = out / f"p{i+1:02d}.png"
    pix.save(png)
    w, h = pix.width, pix.height
    samples = pix.samples
    n = pix.n
    y0 = int(h * 0.52)
    y1 = int(h * 0.90)  # above footer
    total = 0
    cream = 0
    for y in range(y0, y1, 2):
        for x in range(int(w * 0.12), int(w * 0.88), 2):
            idx = (y * w + x) * n
            r, g, b = samples[idx], samples[idx + 1], samples[idx + 2]
            total += 1
            if r > 232 and g > 222 and b > 200 and abs(r - g) < 28:
                cream += 1
    ratio = cream / total if total else 0
    text = page.get_text("text").strip()
    lines = [ln for ln in text.splitlines() if ln.strip()]
    head = lines[0][:64] if lines else "(blank)"
    rows.append({
        "page": i + 1,
        "chars": len(text),
        "lines": len(lines),
        "empty": round(ratio, 3),
        "head": head,
        "png": str(png),
    })
    print(f"{i+1:02d} empty={ratio:.3f} chars={len(text):4d} lines={len(lines):2d} | {head}")

# links
link_count = sum(len(p.get_links()) for p in doc)
print("internal_or_uri_links", link_count)

(out / "summary.json").write_text(json.dumps({
    "pageCount": doc.page_count,
    "bytes": pdf.stat().st_size,
    "toc": doc.get_toc(),
    "pages": rows,
}, indent=2), encoding="utf8")
print("wrote", out)
doc.close()
