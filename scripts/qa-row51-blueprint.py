"""Row 51 mechanical + content-integrity QA for production Blueprint PDFs."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "public" / "downloads" / "blueprint"
GUIDEBOOK = DIR / "the-back-half-blueprint.pdf"

REQUIRED_PHRASES = [
    ("Title", "The Back Half Blueprint"),
    ("Subtitle", "A Seven-Chapter Journey to Intentionally Create a Life of Fullness, Purpose, and Possibility"),
    ("Copyright", "Copyright © 2026 KLW Group, LLC"),
    ("Table of Contents", "Table of Contents"),
    ("Welcome Letter", "Welcome Letter"),
    ("How to Use This Guidebook", "How to Use This Guidebook"),
    ("Architect’s Commitment", "I choose to become the Architect of my life."),
    ("Chapter I", "Chapter I"),
    ("Chapter II", "Chapter II"),
    ("Chapter III", "Chapter III"),
    ("Chapter IV", "Chapter IV"),
    ("Chapter V", "Chapter V"),
    ("Chapter VI", "Chapter VI"),
    ("Chapter VII", "Chapter VII"),
    ("Founder Closing Letter", "A Letter from the Founder"),
    ("About the Founder", "About Kimberly M. Walker"),
    ("Aliveness Index", "Aliveness Index"),
    ("Decision Statement", "Decision Statement"),
    ("Back Half Standards", "Back Half Standards"),
    ("Architect Identity Statement", "Architect Identity Statement"),
    ("Expansion Plan", "Expansion Plan"),
    ("Back Half Declaration", "Back Half Declaration"),
]

STANDALONE = [
    "the-back-half-blueprint.pdf",
    "back-half-aliveness-index.pdf",
    "back-half-architects-commitment.pdf",
    "back-half-decision-statement.pdf",
    "back-half-standards.pdf",
    "back-half-architect-identity-statement.pdf",
    "back-half-expansion-plan.pdf",
    "back-half-declaration.pdf",
    "back-half-architect-completion-certificate.pdf",
]


def inspect_pdf(path: Path) -> dict:
    doc = pymupdf.open(path)
    texts = [page.get_text("text") for page in doc]
    blank = [i + 1 for i, text in enumerate(texts) if not text.strip()]
    links = 0
    for page in doc:
        links += len(page.get_links() or [])
    info = {
        "file": path.name,
        "pages": doc.page_count,
        "bytes": path.stat().st_size,
        "blankPages": blank,
        "internalLinks": links,
        "textChars": sum(len(text) for text in texts),
    }
    doc.close()
    return info, texts


def main() -> int:
    failures: list[str] = []
    report: dict = {"assets": [], "guidebookPhrases": []}

    for name in STANDALONE:
        path = DIR / name
        if not path.exists() or path.stat().st_size < 1000:
            failures.append(f"missing or empty: {name}")
            continue
        info, _ = inspect_pdf(path)
        report["assets"].append(info)
        if info["blankPages"]:
            failures.append(f"blank pages in {name}: {info['blankPages']}")
        if info["pages"] < 1:
            failures.append(f"no pages: {name}")

    if not GUIDEBOOK.exists():
        print("FAIL: complete Blueprint PDF missing")
        return 1

    info, texts = inspect_pdf(GUIDEBOOK)
    full = "\n".join(texts)
    for label, phrase in REQUIRED_PHRASES:
        present = phrase in full
        report["guidebookPhrases"].append({"label": label, "pass": present})
        if not present:
            failures.append(f"missing phrase for {label}: {phrase}")

    if "Certificate of Completion" in full and "This certifies that" not in Path(
        DIR / "back-half-architect-completion-certificate.pdf"
    ).read_bytes().decode("latin-1", errors="ignore"):
        pass

    cert = DIR / "back-half-architect-completion-certificate.pdf"
    if cert.exists():
        _, cert_texts = inspect_pdf(cert)
        cert_full = "\n".join(cert_texts)
        compact = cert_full.replace(" ", "")
        if "This certifies that" not in cert_full:
            failures.append("certificate missing approved completion sentence")
        if "ARCHITECTNAME" not in compact and "ArchitectName" not in compact:
            failures.append("certificate missing Architect Name field")

    alive = DIR / "back-half-aliveness-index.pdf"
    if alive.exists():
        _, alive_texts = inspect_pdf(alive)
        alive_full = "\n".join(alive_texts)
        if "Rating Scale" not in alive_full or "Purpose Score:" not in alive_full:
            failures.append("aliveness index missing approved scoring language")
        if "I wake up excited about the life I am creating." not in alive_full:
            failures.append("aliveness index missing approved questions")

    report["failures"] = failures
    print(json.dumps(report, indent=2))
    if failures:
        print(f"\nFAIL ({len(failures)})")
        return 1
    print("\nPASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
