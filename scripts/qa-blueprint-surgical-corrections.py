"""QA surgical Blueprint corrections against regenerated master PDF."""
from __future__ import annotations

import sys
from pathlib import Path

import pymupdf

PDF = Path(__file__).resolve().parents[1] / "public/downloads/blueprint/the-back-half-blueprint.pdf"


def main() -> int:
    doc = pymupdf.open(PDF)
    print(f"PAGES {len(doc)} BYTES {PDF.stat().st_size}")
    results: dict[str, bool] = {}

    # --- Page 1 cream strip ---
    page = doc[0]
    pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)

    def pixel(x: int, y: int) -> tuple[int, int, int]:
        i = (y * pix.width + x) * 3
        return pix.samples[i], pix.samples[i + 1], pix.samples[i + 2]

    cream = 0
    first_non = None
    for y in range(0, 80):
        r, g, b = pixel(600, y)
        if r > 230 and g > 230 and b > 220:
            cream += 1
        else:
            first_non = (y, (r, g, b))
            break
    print(f"P1 cream_rows={cream} first_non={first_non}")
    results["Page 1 — no top white strip"] = cream < 8

    # --- Page 8 artifact ---
    t8 = doc[7].get_text("text")
    lines8 = [ln.strip() for ln in t8.splitlines() if ln.strip()]
    trailing = [
        ln
        for ln in lines8
        if ln
        not in {
            "8",
            "T H E B A C K H A L F B L U E P R I N T",
            "C O M M I T M E N T",
            "A R C H I T E C T ' S C O M M I T M E N T",
            "Architect's Commitment",
        }
    ][-6:]
    weird = [
        ln
        for ln in trailing
        if len(ln) <= 6 and ln.replace(" ", "").isalpha() and ln.lower() not in {"i"}
    ]
    print("P8 trailing:", trailing)
    print("P8 weird:", weird)
    # True clip markers are short broken fragments, not substrings of "possibility".
    results["Page 8 — no bottom artifact"] = (
        len(weird) == 0
        and "t th t" not in t8
        and "I will not settle for a life that looks acceptable but does not feel alive."
        in t8
        and "I accept that responsibility." not in t8
        and "I understand that creating my Back Half" not in t8
    )

    # --- Page 10 ---
    t10 = doc[9].get_text("text")
    lines10 = [ln.strip() for ln in t10.splitlines() if ln.strip()]
    welcome_own = any(
        ln in {"Welcome, Architect.", "Welcome, Architect"} for ln in lines10
    )
    joined10 = "Welcome, Architect. Before we begin" in " ".join(
        ln.strip() for ln in t10.splitlines()
    ) and not welcome_own
    # stronger: exact line check
    joined10 = any(
        ln.startswith("Welcome, Architect.") and "Before we begin" in ln
        for ln in lines10
    )
    print("P10 welcome_own", welcome_own, "joined", joined10)
    for ln in lines10[:12]:
        if "Welcome" in ln or "Before we begin" in ln:
            print(" ", repr(ln))
    results["Page 10 — Welcome break"] = welcome_own and not joined10

    # --- Page 11 ---
    t11 = doc[10].get_text("text")
    lines11 = [ln.strip() for ln in t11.splitlines() if ln.strip()]
    joined11 = any(
        "Welcome to Chapter One — The Awakening." in ln
        and "Every transformation" in ln
        for ln in lines11
    )
    has_welcome = any(
        ln == "Welcome to Chapter One — The Awakening." for ln in lines11
    )
    has_every = any(
        ln.startswith("Every transformation begins with an awakening.")
        for ln in lines11
    )
    print("P11 welcome", has_welcome, "every", has_every, "joined", joined11)
    for ln in lines11:
        if "Welcome to Chapter" in ln or ln.startswith("Every transformation"):
            print(" ", repr(ln))
    results["Page 11 — Awakening break"] = has_welcome and has_every and not joined11

    # --- Page 18 ---
    t18 = doc[17].get_text("text")
    lines18 = [ln.strip() for ln in t18.splitlines() if ln.strip()]
    own18 = any(ln == "Welcome back." for ln in lines18)
    joined18 = any(
        ln.startswith("Welcome back.") and "One of the greatest" in ln
        for ln in lines18
    )
    print("P18 own", own18, "joined", joined18)
    for ln in lines18:
        if ln.startswith("Welcome") or ln.startswith("One of the greatest"):
            print(" ", repr(ln))
    results["Page 18 — Welcome back break"] = own18 and not joined18

    # --- Box glyphs ---
    box_pages: list[int] = []
    for pn in range(1, len(doc) + 1):
        text = doc[pn - 1].get_text("text")
        if "\x00" in text or "\ue000" in text or "□" in text or "☐" in text:
            box_pages.append(pn)
    print("pages with box/null glyphs:", box_pages)
    for pn in (25, 34, 35, 38):
        text = doc[pn - 1].get_text("text")
        ok = (
            "\x00" not in text
            and "\ue000" not in text
            and "□" not in text
            and "☐" not in text
        )
        results[f"Page {pn} — no boxes"] = ok
        print(f"--- P{pn} sample ---")
        print(text[:500])
    results["Full-document unwanted-glyph scan"] = len(box_pages) == 0

    # --- Magical orphan ---
    overnight_page = None
    for i in range(len(doc)):
        text = doc[i].get_text("text")
        if "One decision may not change your life overnight." in text:
            overnight_page = i + 1
            has_magical = "Magical is Possible." in text
            print(f"Overnight p{overnight_page}, Magical same page={has_magical}")
            results["Pages 48–49 — Magical with overnight page"] = has_magical
            if i + 1 < len(doc):
                nxt = doc[i + 1].get_text("text")
                content = [
                    ln.strip()
                    for ln in nxt.splitlines()
                    if ln.strip()
                    and "B A C K H A L F" not in ln
                    and "D E C I S I O N" not in ln
                    and "B A C K" not in ln
                    and not ln.strip().replace(" ", "").isdigit()
                ]
                magical_only = (
                    any("Magical is Possible." in ln for ln in content)
                    and not any(
                        "One decision" in ln or "Remember" in ln or "Today is" in ln
                        for ln in content
                    )
                    and len(content) <= 2
                )
                print("next content lines:", content[:8])
                results["Pages 48–49 — no Magical-only orphan"] = not magical_only
            break

    # --- Flow samples ---
    for pn in (8, 10, 11, 18, 48, 49, 50, 51, 52, 53, 54, 55, 56):
        if pn <= len(doc):
            print(f"\n===== PAGE {pn} =====")
            print(doc[pn - 1].get_text("text")[:900])

    # Identity / Standards: look for clipped short-line fragments, not "possibility".
    def has_clip_fragments(text: str) -> bool:
        for ln in text.splitlines():
            s = ln.strip()
            if s in {"t th t", "ibilit"}:
                return True
            if len(s) <= 4 and s.isalpha() and s.lower() not in {"i", "my", "and", "the", "a"}:
                # isolated fragment lines near footer are suspicious
                if s.lower() in {"th", "t", "bil", "ity"}:
                    return True
        return False

    identity_ok = True
    identity_pages = []
    for pn in range(1, len(doc) + 1):
        text = doc[pn - 1].get_text("text")
        if "Architect Identity Statement" in text or "A R C H I T E C T I D E N T I T Y" in text:
            identity_pages.append(pn)
            if has_clip_fragments(text):
                identity_ok = False
    results["Architect Identity Statement — no clip artifacts"] = identity_ok and bool(
        identity_pages
    )
    # Cohesive flow: signature/remember not stranded alone without nearby commitment body
    identity_text = "\n".join(doc[pn - 1].get_text("text") for pn in identity_pages)
    results["Architect Identity Statement — content present"] = (
        "I am an Architect who..." in identity_text
        and "Magical is Possible." in identity_text
    )

    standards_ok = True
    for pn in range(1, len(doc) + 1):
        text = doc[pn - 1].get_text("text")
        if "Back Half Standards" in text or "B A C K H A L F S T A N D A R D S" in text:
            if has_clip_fragments(text):
                standards_ok = False
    results["Pages 51–53 Standards — no clip artifacts"] = standards_ok

    print("\n=== RESULTS ===")
    failed = 0
    for name, ok in results.items():
        print(("PASS" if ok else "FAIL"), "-", name)
        if not ok:
            failed += 1
    print(f"\n{len(results) - failed}/{len(results)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
