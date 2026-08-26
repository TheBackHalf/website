"""Extract Blueprint sections from a Foundry docx by heading markers."""
import argparse
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

HEADINGS = [
    "THE BACK HALF BLUEPRINT",
    "Table of Contents",
    "Copyright",
    "Copyright Page",
    "Welcome Letter",
    "Welcome, Architect",
    "How to Use This Guidebook",
    "Architect's Commitment",
    "Chapter One",
    "Chapter Two",
    "Chapter Three",
    "Chapter Four",
    "Chapter Five",
    "Chapter Six",
    "Chapter Seven",
    "Founder Closing Letter",
    "Founder Closing",
    "About the Founder",
    "Aliveness Index",
    "Decision Statement",
    "Back Half Standards",
    "Architect Identity Statement",
    "Expansion Plan",
    "Back Half Declaration",
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


def split_sections(text: str) -> dict[str, str]:
    positions: list[tuple[int, str]] = []
    for heading in HEADINGS:
        index = text.find(heading)
        if index >= 0:
            positions.append((index, heading))
    positions.sort(key=lambda item: item[0])

    sections: dict[str, str] = {}
    for i, (start, heading) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
        body = text[start + len(heading) : end].strip()
        sections[heading] = body
    return sections


def preview(body: str, limit: int = 500) -> str:
    cleaned = re.sub(r"\s+", " ", body)
    return cleaned[:limit] + ("…" if len(cleaned) > limit else "")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("docx")
    parser.add_argument("--out")
    args = parser.parse_args()

    source = Path(args.docx)
    out = Path(args.out) if args.out else Path(__file__).resolve().parent.parent / ".tmp-blueprint-search" / f"{source.stem}-sections.json"

    text = extract_docx(source)
    sections = split_sections(text)
    report = {
        heading: {"chars": len(body), "preview": preview(body)}
        for heading, body in sections.items()
    }
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Source len: {len(text)}")
    print(f"Sections found: {len(sections)}")
    print(f"Written: {out}")
    for heading, meta in report.items():
        print(f"- {heading}: {meta['chars']} chars")


if __name__ == "__main__":
    main()
