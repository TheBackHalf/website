"""Founder review preflight — verify Blueprint corrections on regenerated master PDF."""
from __future__ import annotations

import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "public" / "downloads" / "blueprint" / "the-back-half-blueprint.pdf"


def main() -> int:
    doc = pymupdf.open(PDF)
    n = len(doc)
    texts = [p.get_text("text") for p in doc]
    full = "\n".join(texts)

    def page(i: int) -> str:
        return texts[i - 1] if 1 <= i <= n else ""

    print(f"PAGES: {n}")
    print(f"FILE: {PDF.resolve()}")
    print(f"BYTES: {PDF.stat().st_size}")

    checks: list[tuple[str, bool]] = []

    p1 = page(1)
    checks.append(("P1 title contains Blueprint", "Blueprint" in p1))
    checks.append(
        (
            "P1 seven-chapter present",
            "Seven-Chapter" in p1 or "seven-chapter" in p1.lower() or "Seven" in p1,
        )
    )

    p4 = page(4)
    checks.append(("P4 We meet expectations", "We meet expectations" in p4))
    checks.append(("P4 We achieve goals", "We achieve goals" in p4))
    checks.append(("P4 We care for others", "We care for others" in p4))

    p5 = page(5)
    checks.append(("P5 grateful present", "grateful" in p5.lower()))
    checks.append(("P5 Magical is Possible present", "Magical is Possible" in p5))
    checks.append(("P5 no Let's begin", "Let's begin" not in p5))
    if "In Gratitude" in full:
        after = full.split("In Gratitude", 1)[1][:200]
        checks.append(
            ("P5 Magical not in signature after In Gratitude", "Magical is Possible" not in after)
        )
    else:
        checks.append(("P5 In Gratitude found", False))

    p19 = page(19)
    checks.append(
        (
            "P19 no not-for-yourself / future participants",
            "not for yourself" not in full.lower() and "future participants" not in full.lower(),
        )
    )
    checks.append(("P19 Someone is living", "Someone is living" in p19 or "Someone is living" in full))

    p21 = page(21)
    checks.append(("P21 has content", len(p21.strip()) > 40))

    p22 = page(22)
    for label in [
        "Identity:",
        "Time:",
        "Work:",
        "Relationships:",
        "Health:",
        "Wonder:",
        "Stewardship:",
        "Contribution:",
    ]:
        checks.append((f"P22/full {label}", label in p22 or label in full))

    for pn in [23, 27, 30, 36, 40]:
        pt = page(pn)
        lines = [ln.strip() for ln in pt.splitlines() if ln.strip()]
        has_own = any(
            ln in {"Welcome back, Architect.", "Welcome back, Architect"} for ln in lines
        )
        checks.append((f"P{pn} Welcome back own line", has_own))

    p29 = page(29)
    lines29 = [ln.strip() for ln in p29.splitlines() if ln.strip()]
    checks.append(
        (
            "P29 I no longer negotiate line",
            any("I no longer negotiate with my peace" in ln for ln in lines29)
            or "I no longer negotiate with my peace" in p29,
        )
    )
    checks.append(
        (
            "P29 Examples: present",
            any(ln == "Examples:" or ln.startswith("Examples:") for ln in lines29)
            or "Examples:" in p29,
        )
    )

    checks.append(("full no Three Lives", "Three Lives" not in full))
    checks.append(("full no Person One", "Person One" not in full))

    p36 = page(36)
    same_line = any(
        "Family" in ln and "Friends" in ln and "Communities" in ln for ln in p36.splitlines()
    )
    checks.append(("P36 Family/Friends/Communities same line", same_line))

    p40 = page(40)
    checks.append(("P40 Welcome back present", "Welcome back, Architect" in p40))
    # Prior correction: remove "When you're" from final sentence on p40
    # Flag only if the unwanted fragment remains in the closing area.
    checks.append(
        (
            "P40 no unwanted When you're fragment near end",
            "When you're" not in p40[-400:] if len(p40) > 400 else "When you're" not in p40,
        )
    )

    checks.append(("full no And again", "And again" not in full))

    checks.append(
        (
            "exact decision overnight sentence",
            "One decision may not change your life overnight." in full,
        )
    )

    p60 = page(60)
    checks.append(
        (
            "P60 architect / magical language present",
            "architect" in p60.lower() and "magical is possible" in p60.lower(),
        )
    )

    checks.append(
        (
            "no writing/teaching/technology and AI phrase",
            "through writing, teaching, technology and AI" not in full,
        )
    )

    for m in [
        "ROW87-E2E",
        "ROW87",
        "translation pending",
        "Traducción aprobada",
        "APPROVED COPY PENDING",
        "APPROVED COPY REQUIRED",
        "lorem ipsum",
        "XXXX",
    ]:
        checks.append((f"no QA/dev marker: {m}", m not in full))

    blank = [i + 1 for i, t in enumerate(texts) if not t.strip()]
    checks.append(("no blank pages", len(blank) == 0))

    # Title-page gold / purple sky / alignment / bold cannot be proven from text alone.
    print("\n=== TEXT-VERIFIABLE CORRECTIONS ===")
    fail = 0
    for name, ok in checks:
        status = "PASS" if ok else "FAIL"
        if not ok:
            fail += 1
        print(f"{status}: {name}")

    print(f"\nSUMMARY: {len(checks) - fail}/{len(checks)} passed, {fail} failed")
    print(f"Blank pages: {blank if blank else 'NONE'}")

    for pn in [1, 4, 5, 19, 21, 22, 23, 27, 29, 30, 32, 36, 40, 41, 45, 46, 47, 50, 60, 62, 63]:
        print(f"\n----- PAGE {pn} -----")
        print(page(pn)[:900])

    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
