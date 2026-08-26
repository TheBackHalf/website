"""Extract Founder-approved legal bases from Foundry 8.3 / 8.4 / 8.5.

Does not publish. Does not rewrite. Writes paragraph-level text for
Version 1 finalization only.
"""
from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
OUT = Path(__file__).resolve().parent.parent / ".tmp-legal-v1"
OUT.mkdir(parents=True, exist_ok=True)

FOUNDRY_AUG = Path(
    r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\August 2026"
)
FOUNDRY_ROOT = Path(
    r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry"
)

PATHS = {
    "8.3": FOUNDRY_AUG / "The Back Half_8.3.2026.docx",
    "8.4_aug": FOUNDRY_AUG / "The Back Half_8.4.2026.docx",
    "8.4_root": FOUNDRY_ROOT / "The Back Half_8.4.2026.docx",
    "8.5": FOUNDRY_AUG / "The Back Half_8.5.2026.docx",
}


def paragraph_text(p: ET.Element) -> str:
    parts: list[str] = []
    for node in p.iter(f"{W_NS}t"):
        parts.append(node.text or "")
        if node.tail:
            parts.append(node.tail)
    return "".join(parts).strip()


def is_heading(p: ET.Element) -> bool:
    ppr = p.find(f"{W_NS}pPr")
    if ppr is None:
        return False
    style = ppr.find(f"{W_NS}pStyle")
    if style is not None:
        val = (style.get(f"{W_NS}val") or "").lower()
        if "heading" in val or val.startswith("h"):
            return True
    outline = ppr.find(f"{W_NS}outlineLvl")
    return outline is not None


def extract_paragraphs(path: Path) -> list[dict]:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    body = root.find(f"{W_NS}body")
    rows: list[dict] = []
    if body is None:
        return rows
    for i, p in enumerate(body.findall(f"{W_NS}p")):
        text = paragraph_text(p)
        if not text:
            continue
        rows.append({"i": i, "heading": is_heading(p), "text": text})
    return rows


def find_start(rows: list[dict], patterns: list[str]) -> int | None:
    compiled = [re.compile(p, re.I) for p in patterns]
    for row in rows:
        for pat in compiled:
            if pat.search(row["text"]):
                return row["i"]
    return None


def slice_by_index(rows: list[dict], start_i: int, end_i: int | None) -> list[dict]:
    out = []
    for row in rows:
        if row["i"] < start_i:
            continue
        if end_i is not None and row["i"] >= end_i:
            break
        out.append(row)
    return out


def main() -> None:
    inventory = {}
    for key, path in PATHS.items():
        inventory[key] = {"path": str(path), "exists": path.exists()}
        if path.exists():
            inventory[key]["bytes"] = path.stat().st_size

    (OUT / "inventory.json").write_text(json.dumps(inventory, indent=2), encoding="utf-8")

    loaded: dict[str, list[dict]] = {}
    for key, path in PATHS.items():
        if not path.exists():
            continue
        paras = extract_paragraphs(path)
        loaded[key] = paras
        (OUT / f"{key}-paragraphs.json").write_text(
            json.dumps(paras, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        preview = [f"{p['i']:04d} {'H' if p['heading'] else ' '} {p['text'][:220]}" for p in paras]
        (OUT / f"{key}-preview.txt").write_text("\n".join(preview), encoding="utf-8")

    # Keyword index for 8.3 / 8.4 / 8.5
    keywords = [
        "Privacy Policy",
        "Terms of Use",
        "Terms of Service",
        "Participant Agreement",
        "Membership Agreement",
        "AI Disclosure",
        "Community Guidelines",
        "Architect Community Guidelines",
        "legal@",
        "billing@",
        "privacy@",
        "support@",
        "kimberly@",
        "August 19",
        "August 31",
        "Version 1",
        "refund",
        "18",
        "COPPA",
        "The Back Half®",
        "transformational life design",
        "Global Life Design",
    ]
    index: dict[str, dict[str, list[dict]]] = {}
    for key, paras in loaded.items():
        index[key] = {}
        for kw in keywords:
            hits = []
            for p in paras:
                if kw.lower() in p["text"].lower() or (kw == "The Back Half®" and "®" in p["text"]):
                    hits.append({"i": p["i"], "text": p["text"][:400]})
            if hits:
                index[key][kw] = hits
    (OUT / "keyword-index.json").write_text(
        json.dumps(index, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(json.dumps({"inventory": inventory, "loaded": {k: len(v) for k, v in loaded.items()}}, indent=2))


if __name__ == "__main__":
    main()
