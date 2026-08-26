import json
import os
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

PHRASES = [
    "THE BACK HALF BLUEPRINT",
    "Welcome Letter",
    "Welcome, Architect",
    "How to Use This Guidebook",
    "Architect's Commitment",
    "Chapter I",
    "Chapter One",
    "Chapter VII",
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
    "Table of Contents",
    "Copyright",
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


roots = [
    Path(r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry"),
    Path(r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\Assets"),
    Path(r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\Launch\01 Master Blueprint"),
    Path(r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half"),
]

out_dir = Path(__file__).resolve().parent.parent / ".tmp-blueprint-search"
out_dir.mkdir(exist_ok=True)

rows: list[dict] = []

for root in roots:
    if not root.exists():
        continue
    for path in root.rglob("*.docx"):
        try:
            text = extract_docx(path)
        except Exception as error:
            rows.append({"file": str(path), "error": str(error)})
            continue
        hits = {phrase: text.find(phrase) for phrase in PHRASES if phrase in text}
        if hits:
            rows.append(
                {
                    "file": str(path),
                    "size": path.stat().st_size,
                    "len": len(text),
                    "hits": hits,
                    "hit_count": len(hits),
                }
            )

rows.sort(key=lambda row: row.get("hit_count", 0), reverse=True)

summary_path = out_dir / "full-scan.json"
summary_path.write_text(json.dumps(rows, indent=2), encoding="utf-8")

# Extract top candidate if it has many hits
for row in rows[:3]:
    if "file" in row and row.get("hit_count", 0) >= 8:
        text = extract_docx(Path(row["file"]))
        name = Path(row["file"]).name.replace(".docx", ".full.txt")
        (out_dir / name).write_text(text, encoding="utf-8")

print(f"Scanned. Matches: {len(rows)}. Written: {summary_path}")
