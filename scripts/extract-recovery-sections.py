"""Extract candidate verbatim sections from Foundry + Assets for Row 46 recovery audit."""
from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
ROOT = Path(r"c:\Users\smyle\OneDrive\Desktop\The Back Half")
OUT = Path(__file__).resolve().parent.parent / ".tmp-blueprint-search" / "recovery" / "sections"

SOURCES = {
    "8.1": ROOT / "The Back Half" / "The Foundry" / "August 2026" / "The Back Half_8.1.2026.docx",
    "8.3": ROOT / "The Back Half" / "The Foundry" / "August 2026" / "The Back Half_8.3.2026.docx",
    "8.4": ROOT / "The Back Half" / "The Foundry" / "The Back Half_8.4.2026.docx",
    "7.31": ROOT / "The Back Half" / "The Foundry" / "July 2026" / "The Back Half_7.31.2026.docx",
    "aliveness": ROOT / "The Back Half" / "Assets" / "The Aliveness Project_6.28.2026.docx",
    "mirror": ROOT / "The Back Half" / "Assets" / "The Back Half Mirror_7.1.2026.docx",
    "standards": ROOT / "The Back Half" / "Assets" / "The Standards Exercise_6.30.2026.docx",
    "decision_ladder": ROOT / "The Back Half" / "Assets" / "The Decision Ladder_7.1.2026.xlsx",
    "three_lives": ROOT / "The Back Half" / "Assets" / "The Three Lives Exercise_6.30.2026.docx",
    "manifesto": ROOT / "The Back Half" / "Assets" / "The Back Half Manifesto_6.26.2026.docx",
}


def extract_docx(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    root = ET.fromstring(xml)
    return "".join(
        (node.text or "") + (node.tail or "")
        for node in root.iter(f"{W_NS}t")
    )


def extract_xlsx(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("xl/sharedStrings.xml")
    root = ET.fromstring(xml)
    return " ".join(t.text for t in root.iter(f"{W_NS}t") if t.text)


def slice_after(text: str, start: str, end: str | None = None) -> str | None:
    index = text.find(start)
    if index < 0:
        return None
    index += len(start)
    if end:
        end_index = text.find(end, index)
        if end_index < 0:
            return None
        return text[index:end_index].strip()
    return text[index:].strip()


def clean_block(text: str) -> str:
    text = re.split(r"My Response:", text)[0]
    text = re.split(r"AI Kimberly", text)[0]
    text = re.split(r"Approve\?", text)[0]
    return text.strip()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    texts = {}
    for key, path in SOURCES.items():
        if not path.exists():
            continue
        texts[key] = extract_xlsx(path) if path.suffix == ".xlsx" else extract_docx(path)

    sections: dict[str, dict] = {}

    t81 = texts.get("8.1", "")
    t84 = texts.get("8.4", "")
    t731 = texts.get("7.31", "")

    mappings = [
        ("title", t81, "CopyrightThe Back Half Blueprint", "A Seven-Chapter Journey"),
        ("subtitle", t81, "A Seven-Chapter Journey to Intentionally Create a Life of Fullness, Purpose, and Possibility", "Copyright"),
        ("copyright", t81, "CopyrightThe Back Half Blueprint", "Table of Contents"),
        ("table-of-contents", t81, "Table of Contents", "Welcome"),
        ("welcome-letter", t81, "Welcome, Architect", "How to Use This Guidebook"),
        ("how-to-use", t81, "How to Use This Guidebook", "Architect's Commitment"),
        ("architects-commitment", t81, "Architect's Commitment", "Chapter One"),
        ("about-founder", t81, "About the Founder", "Aliveness Index"),
        ("founder-closing", t81, "Founder Closing", "About the Founder"),
    ]

    for section_id, text, start, end in mappings:
        block = slice_after(text, start, end)
        if block:
            sections[section_id] = {
                "source": "8.1",
                "chars": len(block),
                "text": clean_block(block),
            }

    chapter_slices = [
        ("chapter-1-awakening", "Chapter One", "Chapter Two"),
        ("chapter-2-mirror", "Chapter Two", "Chapter Three"),
        ("chapter-3-decision", "Chapter Three", "Chapter Four"),
        ("chapter-4-standards", "Chapter Four", "Chapter Five"),
        ("chapter-5-architect", "Chapter Five", "Chapter Six"),
        ("chapter-6-expansion", "Chapter Six", "Chapter Seven"),
        ("chapter-7-beginning", "Chapter Seven", "Aliveness Index"),
    ]
    for section_id, start, end in chapter_slices:
        block = slice_after(t84, start, end) or slice_after(t81, start, end)
        if block:
            sections[section_id] = {
                "source": "8.4/8.1",
                "chars": len(block),
                "text": clean_block(block),
            }

    asset_map = {
        "aliveness-index": ("aliveness", None, None),
        "back-half-standards": ("standards", "Final Standards (from ChatGPT)", None),
        "chapter-2-mirror-exercise": ("mirror", "Back Half Mirror Responses:", None),
        "chapter-5-exercise": ("three_lives", "The Three Lives Exercise", None),
        "decision-ladder": ("decision_ladder", None, None),
    }
    for section_id, (key, start, end) in asset_map.items():
        text = texts.get(key, "")
        if not text:
            continue
        block = slice_after(text, start, end) if start else text
        if block:
            sections[section_id] = {
                "source": key,
                "chars": len(block),
                "text": clean_block(block),
            }

    artifact_patterns = [
        ("decision-statement", t731, "Decision Statement", "Back Half Standards"),
        ("architect-identity-statement", t731, "Architect Identity Statement", "Expansion Plan"),
        ("expansion-plan", t731, "Expansion Plan", "Back Half Declaration"),
        ("back-half-declaration", t731, "Back Half Declaration", "Welcome Letter"),
    ]
    for section_id, text, start, end in artifact_patterns:
        block = slice_after(text, start, end)
        if block:
            sections[section_id] = {
                "source": "7.31",
                "chars": len(block),
                "text": clean_block(block),
            }

    manifesto = texts.get("manifesto", "")
    v6 = slice_after(manifesto, "Version 6 (Kim)- FINAL VERSION FOR 6.26.2026", "Version ")
    if v6:
        sections["manifesto-v6-final"] = {"source": "manifesto", "chars": len(v6), "text": v6}

    summary = {
        k: {"source": v["source"], "chars": v["chars"], "preview": v["text"][:300]}
        for k, v in sections.items()
    }
    (OUT / "extracted-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    for key, value in sections.items():
        (OUT / f"{key}.txt").write_text(value["text"], encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
