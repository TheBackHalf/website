"""Render Blueprint PDF pages to PNGs and extract text for QA."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "public" / "downloads" / "blueprint" / "the-back-half-blueprint.pdf"
OUT = ROOT / ".tmp-blueprint-qa-final"


def main() -> int:
    if not PDF.exists():
        print(f"MISSING {PDF}")
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(PDF)
    summary = []
    defects = []

    for i, page in enumerate(doc):
        n = i + 1
        text = page.get_text("text")
        compact = re.sub(r"\s+", " ", text).strip()
        png = OUT / f"page-{n:02d}.png"
        pix = page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False)
        pix.save(png)

        flags = {
            "continued": bool(re.search(r"\bCONTINUED\b", text, re.I)),
            "begin_here": bool(re.search(r"\bBEGIN HERE\b", text, re.I)),
            "digital_edition": bool(re.search(r"Digital Edition|Print Edition", text, re.I)),
            "approved_copy_required": "APPROVED COPY REQUIRED" in text,
            "bunched_chapter_includes": bool(
                re.search(r"Each chapter includes:\s*A Founder WelcomeA Core", text)
            ),
            "empty": not compact,
        }
        for key, bad in flags.items():
            if bad:
                defects.append({"page": n, "defect": key})

        summary.append(
            {
                "page": n,
                "chars": len(compact),
                "preview": compact[:280],
                "png": str(png.relative_to(ROOT)),
                "flags": flags,
            }
        )

    report = {
        "pdf": str(PDF.relative_to(ROOT)),
        "total_pages": len(doc),
        "defect_count": len(defects),
        "defects": defects,
        "pages": summary,
    }
    (OUT / "audit-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"PAGES {len(doc)}")
    print(f"DEFECTS {len(defects)}")
    for d in defects:
        print(f"  p{d['page']}: {d['defect']}")
    print(f"WROTE {OUT / 'audit-report.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
