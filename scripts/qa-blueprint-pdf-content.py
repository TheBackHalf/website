"""Extract Blueprint PDF text and verify launch-readiness content corrections."""
from __future__ import annotations

import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF = ROOT / "public" / "downloads" / "blueprint" / "the-back-half-blueprint.pdf"


def main() -> int:
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    doc = pymupdf.open(pdf_path)
    texts = [page.get_text("text") for page in doc]
    full = "\n".join(texts)
    n = len(doc)

    checks: list[tuple[str, bool]] = []

    p0 = texts[0] if n else ""
    checks.append(("title present", "Blueprint" in p0))
    checks.append(
        (
            "subtitle seven-chapter present",
            any("Seven-Chapter Journey" in t for t in texts[:3]),
        )
    )

    welcome = "\n".join(texts[2:7])
    checks.append(
        (
            "welcome statements present",
            "We meet expectations" in welcome
            and "We achieve goals" in welcome
            and "We care for others" in welcome,
        )
    )
    checks.append(("no Let's begin near welcome", "Let's begin." not in welcome))

    if "In Gratitude" in full:
        after = full.split("In Gratitude", 1)[1][:500]
        checks.append(
            (
                "signature omits Magical is Possible",
                "Magical is Possible" not in after,
            )
        )
    else:
        checks.append(("signature block found", False))

    checks.append(
        (
            "page19 founder-participant phrase removed",
            "Not for yourself" not in full and "future participants" not in full.lower(),
        )
    )
    checks.append(("identity colon", "Identity:" in full))
    checks.append(("time colon", "Time:" in full))
    checks.append(
        (
            "three lives removed",
            "Three Lives" not in full and "Person One" not in full,
        )
    )
    checks.append(
        (
            "decision may wording",
            "One decision may not change your life overnight." in full,
        )
    )
    checks.append(("about founder sentence", "Today, Kimberly is building" in full))
    checks.append(
        (
            "no teaching tech AI phrase",
            "through writing, teaching, technology and AI" not in full,
        )
    )
    checks.append(("no Again. And again.", "Again. And again." not in full))
    checks.append(
        (
            "no developer approval language",
            "APPROVED COPY" not in full.upper() or "APPROVED COPY" not in full,
        )
    )
    # clearer developer check
    checks[-1] = (
        "no developer approval language",
        "APPROVED COPY" not in full and "APPROVED COPY PENDING" not in full,
    )
    checks.append(
        (
            "family friends communities",
            "Family" in full and "Friends" in full and "Communities" in full,
        )
    )
    checks.append(("welcome back architect present", "Welcome back, Architect" in full))
    checks.append(("grateful present", "grateful" in full.lower()))
    checks.append(("magical is possible present", "Magical is Possible" in full))

    personalized = (
        "creating with purpose" in full
        or "protect my peace" in full
        or "BETA ONLY" in full
    )
    checks.append(
        (
            f"template mode noted (personalized={'yes' if personalized else 'no'})",
            True,
        )
    )

    failed = 0
    print(f"PDF: {pdf_path}")
    print(f"Pages: {n}")
    for label, ok in checks:
        print(f"{'PASS' if ok else 'FAIL'} - {label}")
        if not ok:
            failed += 1

    for i in [0, 3, 4, 5, min(18, n - 1), min(31, n - 1), max(0, n - 2)]:
        if 0 <= i < n:
            snippet = " ".join(texts[i].split())[:240]
            print(f"\n--- page {i + 1} ---\n{snippet}")

    doc.close()
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
