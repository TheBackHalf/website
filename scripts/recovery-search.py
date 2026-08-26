"""Comprehensive Back Half Blueprint content recovery search."""
from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(r"c:\Users\smyle\OneDrive\Desktop\The Back Half")
OUT = Path(__file__).resolve().parent.parent / ".tmp-blueprint-search" / "recovery"
W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

SKIP_DIRS = {
    "node_modules",
    ".next",
    ".git",
    "dist",
    "build",
    ".cursor",
}

SECTION_PATTERNS: list[tuple[str, list[str]]] = [
    ("title", ["^Title$", "THE BACK HALF BLUEPRINT", "The Back Half Blueprint"]),
    ("subtitle", ["^Subtitle$", "A Seven-Chapter Journey"]),
    ("copyright", ["^Copyright$", "Copyright Page", "Copyright © 2026 KLW Group"]),
    ("table-of-contents", ["^Table of Contents$", "Table of ContentsWelcome"]),
    ("welcome-letter", ["^Welcome Letter$", "Welcome, Architect", "Welcome to The Back Half Blueprint"]),
    ("how-to-use", ["How to Use This Guidebook", "How to Use This Journey"]),
    ("architects-commitment", ["Architect's Commitment", "The Architect's Commitment", "Architect Commitment"]),
    ("chapter-1-awakening", ["Chapter I — The Awakening", "Chapter One - The Awakening", "Chapter OneThe Awakening", "Welcome to Chapter One"]),
    ("chapter-2-mirror", ["Chapter II — The Mirror", "Chapter Two - The Mirror", "Chapter Two — Seeing Yourself Clearly", "The Back Half Mirror"]),
    ("chapter-3-decision", ["Chapter III — The Decision", "Chapter Three - The Decision", "Chapter Three — Choosing Intention", "The Decision Ladder"]),
    ("chapter-4-standards", ["Chapter IV — The Standards", "Chapter Four - The Standards", "Chapter Four — Creating Your Standards", "The Standards Exercise"]),
    ("chapter-5-architect", ["Chapter V — Becoming the Architect", "Chapter Five - Becoming the Architect", "Chapter Five — Becoming the Architect", "The Three Lives Exercise", "Becoming the Architect"]),
    ("chapter-6-expansion", ["Chapter VI — Expansion", "Chapter Six - Expansion", "Chapter Six — Expansion", "Send Chapter Six"]),
    ("chapter-7-beginning", ["Chapter VII — The Beginning", "Chapter Seven - The Beginning", "Chapter Seven — Living Your Back Half", "Living Your Back Half"]),
    ("founder-closing", ["Founder Closing Letter", "Founder Closing", "A Letter from the Founder", "ClosingA Letter from the Founder"]),
    ("about-founder", ["About the Founder", "About Kimberly M. Walker", "Kimberly M. Walker is the Founder"]),
    ("aliveness-index", ["Aliveness Index", "The Aliveness Index", "The Aliveness Project"]),
    ("decision-statement", ["Decision Statement", "Beginning today, I choose to"]),
    ("back-half-standards", ["Back Half Standards", "The Universal Standards of The Back Half", "What is no longer negotiable"]),
    ("architect-identity-statement", ["Architect Identity Statement", "I am an Architect who"]),
    ("expansion-plan", ["Expansion Plan", "Choose one intentional action in each of these three areas"]),
    ("back-half-declaration", ["Back Half Declaration", "Beginning today, I will intentionally create a life that"]),
    ("certificate", ["Completion Certificate", "Architect Completion Certificate", "certificate-quality final page"]),
]


def extract_docx(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    root = ET.fromstring(xml)
    parts: list[str] = []
    for node in root.iter(f"{W_NS}t"):
        if node.text:
            parts.append(node.text)
        if node.tail:
            parts.append(node.tail)
    return "".join(parts)


def extract_xlsx(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        if "xl/sharedStrings.xml" not in archive.namelist():
            return ""
        xml = archive.read("xl/sharedStrings.xml")
    root = ET.fromstring(xml)
    return " ".join(t.text for t in root.iter(f"{W_NS}t") if t.text)


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".docx":
        return extract_docx(path)
    if suffix == ".xlsx":
        return extract_xlsx(path)
    if suffix in {".txt", ".md", ".json", ".ts", ".tsx"}:
        return path.read_text(encoding="utf-8", errors="ignore")
    return ""


def iter_files() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() not in {".docx", ".xlsx", ".pdf", ".txt", ".md", ".json", ".ts", ".tsx"}:
            continue
        files.append(path)
    return files


def find_hits(text: str, patterns: list[str]) -> list[str]:
    hits: list[str] = []
    for pattern in patterns:
        if pattern.startswith("^"):
            if re.search(pattern, text, re.MULTILINE):
                hits.append(pattern)
        elif pattern in text:
            hits.append(pattern)
    return hits


def preview_at(text: str, needle: str, radius: int = 220) -> str:
    index = text.find(needle)
    if index < 0:
        return ""
    start = max(0, index - 40)
    end = min(len(text), index + radius)
    return re.sub(r"\s+", " ", text[start:end]).strip()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    files = iter_files()
    section_sources: dict[str, list[dict]] = {key: [] for key, _ in SECTION_PATTERNS}

    file_records: list[dict] = []
    for path in files:
        try:
            text = extract_text(path)
        except Exception as error:
            file_records.append({"file": str(path), "error": str(error)})
            continue
        if not text.strip():
            continue

        rel = str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)
        matched_sections: list[str] = []
        for section_id, patterns in SECTION_PATTERNS:
            hits = find_hits(text, patterns)
            if hits:
                matched_sections.append(section_id)
                section_sources[section_id].append(
                    {
                        "file": rel,
                        "hits": hits,
                        "chars": len(text),
                        "preview": preview_at(text, hits[0]),
                    }
                )

        if matched_sections:
            file_records.append(
                {
                    "file": rel,
                    "size": path.stat().st_size,
                    "chars": len(text),
                    "sections": matched_sections,
                }
            )
            if path.suffix.lower() == ".docx":
                safe = re.sub(r"[^\w\-]+", "_", rel)[:120]
                (OUT / f"{safe}.txt").write_text(text, encoding="utf-8")

    report = {
        "files_scanned": len(files),
        "files_with_hits": len(file_records),
        "section_sources": section_sources,
        "file_records": file_records,
    }
    (OUT / "recovery-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({k: len(v) for k, v in section_sources.items()}, indent=2))


if __name__ == "__main__":
    main()
