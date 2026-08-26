"""Regenerate .tmp-blueprint-qa-final/audit-report.json from current PDF."""
from __future__ import annotations

import json
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "public" / "downloads" / "blueprint" / "the-back-half-blueprint.pdf"
OUT_DIR = ROOT / ".tmp-blueprint-qa-final"
OUT_DIR.mkdir(parents=True, exist_ok=True)

doc = fitz.open(PDF)
pages = []
for i, page in enumerate(doc):
    text = page.get_text("text")
    png = OUT_DIR / f"page-{i+1:02d}.png"
    page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(png)
    pages.append(
        {
            "page": i + 1,
            "chars": len(text),
            "preview": " ".join(text.split())[:280],
            "png": str(png.relative_to(ROOT)),
        }
    )

full = "\n".join(p.get_text("text") for p in doc)
checks = {
    "continued": full.upper().count("CONTINUED"),
    "begin_here": full.upper().count("BEGIN HERE"),
    "digital_edition": full.lower().count("digital edition"),
    "approved_copy": full.count("APPROVED COPY"),
    "three_lives": full.count("Three Lives"),
    "and_again": full.count("And again"),
    "not_for_yourself": full.lower().count("not for yourself"),
    "through_writing_teaching": full.count("through writing, teaching"),
    "kimberly_founder": full.count("Kimberly M. Walker, Founder"),
    "one_decision": full.count("One decision may not change your life overnight"),
    "schedule_ok": full.count("My schedule reflects my priorities"),
    "clipped_y": full.count("M sched"),
}

report = {
    "pdf": str(PDF.relative_to(ROOT)),
    "total_pages": doc.page_count,
    "size": PDF.stat().st_size,
    "checks": checks,
    "pages": pages,
}
out = OUT_DIR / "audit-report.json"
out.write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({"pages": doc.page_count, "checks": checks, "report": str(out)}, indent=2))
