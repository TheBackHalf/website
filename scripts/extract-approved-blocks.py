"""Extract founder-approved Blueprint blocks from Foundry docx journals."""
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

SOURCES = {
    "8.1": Path(
        r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\August 2026\The Back Half_8.1.2026.docx"
    ),
    "8.4": Path(
        r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\The Back Half_8.4.2026.docx"
    ),
}

OUT_DIR = Path(__file__).resolve().parent.parent / ".tmp-blueprint-search" / "approved-blocks"


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


def normalize(text: str) -> str:
    text = text.replace("\u2014", "—").replace("\u2013", "–").replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"')
    text = re.sub(r"My Response:.*?(?=Send the |$)", " ", text, flags=re.DOTALL)
    text = re.sub(r"AI Kimberly.*?(?=Send the |Welcome, Architect|Copyright|Table of Contents|Chapter |About the Founder|Founder Closing|$)", " ", text, flags=re.DOTALL)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def slice_between(text: str, start: str, end: str | None) -> str | None:
    start_index = text.find(start)
    if start_index < 0:
        return None
    start_index += len(start)
    if end:
        end_index = text.find(end, start_index)
        if end_index < 0:
            return None
        return text[start_index:end_index].strip()
    return text[start_index:].strip()


def paragraphs(text: str) -> list[str]:
    chunks = re.split(r"(?<=[.!?])\s+(?=[A-Z\"'])", text)
    return [chunk.strip() for chunk in chunks if chunk.strip()]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    texts = {key: extract_docx(path) for key, path in SOURCES.items()}

    blocks: dict[str, dict] = {}

    copyright_block = slice_between(texts["8.1"], "Copyright Page", "Table of Contents")
    if not copyright_block:
        copyright_block = slice_between(texts["8.1"], "Copyright", "Table of Contents")
    if copyright_block:
        blocks["copyright"] = {"source": "8.1", "text": normalize(copyright_block)}

    welcome_block = slice_between(texts["8.1"], "Welcome, Architect", "How to Use This Guidebook")
    if welcome_block:
        welcome_block = re.split(r"In Gratitude,\s*Kimberly M\. Walker", welcome_block)[0]
        blocks["welcomeLetter"] = {"source": "8.1", "text": normalize(welcome_block)}

    how_to_block = slice_between(texts["8.1"], "How to Use This Guidebook", "Architect's Commitment")
    if how_to_block:
        how_to_block = re.split(r"My Response:", how_to_block)[0]
        blocks["howToUse"] = {"source": "8.1", "text": normalize(how_to_block)}

    commitment_block = slice_between(texts["8.1"], "Architect's Commitment", "Chapter One")
    if commitment_block:
        blocks["architectsCommitment"] = {"source": "8.1", "text": normalize(commitment_block)}

    about_block = slice_between(texts["8.1"], "About the Founder", "Aliveness Index")
    if about_block:
        about_block = re.split(r"My Response:", about_block)[0]
        blocks["aboutFounder"] = {"source": "8.1", "text": normalize(about_block)}

    chapter_patterns = [
        ("chapter-1-awakening", "Chapter One", "Chapter Two"),
        ("chapter-2-mirror", "Chapter Two", "Chapter Three"),
        ("chapter-3-decision", "Chapter Three", "Chapter Four"),
        ("chapter-4-standards", "Chapter Four", "Chapter Five"),
        ("chapter-5-architect", "Chapter Five", "Chapter Six"),
        ("chapter-6-expansion", "Chapter Six", "Chapter Seven"),
        ("chapter-7-beginning", "Chapter Seven", "Aliveness Index"),
    ]

    for chapter_id, start, end in chapter_patterns:
        block = slice_between(texts["8.4"], start, end)
        if block:
            block = re.split(r"My Response:|AI Kimberly", block)[0]
            blocks[chapter_id] = {"source": "8.4", "text": normalize(block)}

    closing_block = slice_between(texts["8.1"], "Founder Closing", "About the Founder")
    if closing_block:
        blocks["founderClosing"] = {"source": "8.1", "text": normalize(closing_block)}

    artifact_patterns = [
        ("aliveness-index", "Aliveness Index", "Decision Statement"),
        ("decision-statement", "Decision Statement", "Back Half Standards"),
        ("back-half-standards", "Back Half Standards", "Architect Identity Statement"),
        ("architect-identity-statement", "Architect Identity Statement", "Expansion Plan"),
        ("expansion-plan", "Expansion Plan", "Back Half Declaration"),
        ("back-half-declaration", "Back Half Declaration", "Copyright"),
    ]

    for artifact_id, start, end in artifact_patterns:
        block = slice_between(texts["8.1"], start, end)
        if block and len(block.strip()) > 20:
            blocks[artifact_id] = {"source": "8.1", "text": normalize(block)}

    report = {
        key: {
            "source": value["source"],
            "chars": len(value["text"]),
            "paragraphs": len(paragraphs(value["text"])),
            "preview": value["text"][:300],
        }
        for key, value in blocks.items()
    }

    (OUT_DIR / "approved-blocks.json").write_text(
        json.dumps({"blocks": blocks, "report": report}, indent=2),
        encoding="utf-8",
    )

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
