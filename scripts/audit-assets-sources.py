"""Audit Back Half Assets folder for Row 46 Blueprint content."""
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
ASSETS = Path(r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\Assets")
OUT = Path(__file__).resolve().parent.parent / ".tmp-blueprint-search" / "assets-audit"

SECTIONS = [
    "Title",
    "Subtitle",
    "Copyright",
    "Table of Contents",
    "Welcome Letter",
    "How to Use This Guidebook",
    "Architect's Commitment",
    "Chapter I",
    "The Awakening",
    "Chapter II",
    "The Mirror",
    "Chapter III",
    "The Decision",
    "Chapter IV",
    "The Standards",
    "Chapter V",
    "Becoming the Architect",
    "Chapter VI",
    "Expansion",
    "Chapter VII",
    "The Beginning",
    "Founder Closing",
    "About the Founder",
    "Aliveness Index",
    "Decision Statement",
    "Back Half Standards",
    "Architect Identity Statement",
    "Expansion Plan",
    "Back Half Declaration",
    "Completion Certificate",
    "Magical is Possible",
    "Kimberly M. Walker",
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


def extract_xlsx_shared_strings(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        if "xl/sharedStrings.xml" not in archive.namelist():
            return ""
        xml = archive.read("xl/sharedStrings.xml")
    root = ET.fromstring(xml)
    parts: list[str] = []
    for node in root.iter(f"{W_NS}t"):
        if node.text:
            parts.append(node.text)
    return " ".join(parts)


def paragraphs(text: str) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []
    chunks = re.split(r"(?<=[.!?])\s+(?=[A-Z\"'(])", cleaned)
    return [chunk.strip() for chunk in chunks if chunk.strip()]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    inventory: list[dict] = []

    for path in sorted(ASSETS.iterdir()):
        if not path.is_file():
            continue
        try:
            if path.suffix.lower() == ".docx":
                text = extract_docx(path)
            elif path.suffix.lower() == ".xlsx":
                text = extract_xlsx_shared_strings(path)
            else:
                text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception as error:
            inventory.append({"file": path.name, "error": str(error)})
            continue

        hits = {phrase: text.find(phrase) for phrase in SECTIONS if phrase in text}
        (OUT / f"{path.stem}.txt").write_text(text, encoding="utf-8")
        inventory.append(
            {
                "file": path.name,
                "size": path.stat().st_size,
                "chars": len(text),
                "paragraphs": len(paragraphs(text)),
                "hits": hits,
                "preview": re.sub(r"\s+", " ", text)[:600],
            }
        )

    (OUT / "inventory.json").write_text(json.dumps(inventory, indent=2), encoding="utf-8")
    print(json.dumps(inventory, indent=2))


if __name__ == "__main__":
    main()
