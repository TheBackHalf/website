"""Precise section extraction from Foundry 8.1 and 8.3 for recovery audit."""
from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
OUT = Path(__file__).resolve().parent.parent / ".tmp-blueprint-search" / "recovery" / "sections-v2"
OUT.mkdir(parents=True, exist_ok=True)

PATHS = {
    "8.1": Path(
        r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\August 2026\The Back Half_8.1.2026.docx"
    ),
    "8.3": Path(
        r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\August 2026\The Back Half_8.3.2026.docx"
    ),
    "8.4": Path(
        r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\The Back Half_8.4.2026.docx"
    ),
}


def extract_docx(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    root = ET.fromstring(xml)
    return "".join(
        (node.text or "") + (node.tail or "")
        for node in root.iter(f"{W_NS}t")
    )


def slice_text(text: str, start: str, end: str | None) -> str | None:
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


def main() -> None:
    texts = {key: extract_docx(path) for key, path in PATHS.items()}
    t81, t83, t84 = texts["8.1"], texts["8.3"], texts["8.4"]
    sections: dict[str, str | None] = {}

    sections["copyright-8.1"] = slice_text(t81, "CopyrightThe Back Half Blueprint", "Table of Contents")
    sections["welcome-letter-8.1"] = slice_text(t81, "Welcome, Architect", "How to Use This Guidebook")
    sections["how-to-use-8.1"] = slice_text(t81, "How to Use This Guidebook", "Architect's Commitment")
    sections["architects-commitment-8.1"] = slice_text(t81, "Architect's Commitment", "Chapter One")
    sections["about-founder-8.1"] = slice_text(
        t81, "Send the About the FounderAbout the Founder", "Aliveness Index"
    )
    sections["founder-closing-8.1"] = slice_text(t81, "Founder Closing", "About the Founder")
    sections["toc-8.1"] = slice_text(t81, "Table of Contents", "Welcome")

    sections["welcome-8.4"] = slice_text(t84, "Welcome, Architect.", "My Response:")

    chapter_markers_83 = [
        ("chapter-1-8.3", "Chapter One — Founder Welcome", "Chapter Two — Founder Welcome"),
        ("chapter-2-8.3", "Chapter Two — Founder Welcome", "Chapter Three — Founder Welcome"),
        ("chapter-3-8.3", "Chapter Three — Founder Welcome", "Chapter Four — Founder Welcome"),
        ("chapter-4-8.3", "Chapter Four — Founder Welcome", "Chapter Five — Founder Welcome"),
        ("chapter-5-8.3", "Chapter Five — Founder Welcome", "Chapter Six — Founder Welcome"),
        ("chapter-6-8.3", "Chapter Six — Founder Welcome", "Chapter Seven — Founder Welcome"),
        ("chapter-7-8.3", "Chapter Seven — Founder Welcome", "Completion Certificate"),
    ]
    for key, start, end in chapter_markers_83:
        block = slice_text(t83, start, end)
        if not block:
            block = slice_text(t83, start.replace("—", "�"), end.replace("—", "�"))
        sections[key] = block

    sections["certificate-8.3"] = slice_text(t83, "Completion Certificate", None)

    summary = {
        key: {
            "chars": len(value),
            "preview": re.sub(r"\s+", " ", value)[:280],
        }
        for key, value in sections.items()
        if value
    }

    (OUT / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    for key, value in sections.items():
        if value:
            (OUT / f"{key}.txt").write_text(value, encoding="utf-8")

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
