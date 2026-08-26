import json
import os
import zipfile
import xml.etree.ElementTree as ET

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def extract_docx(path: str) -> str:
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


PHRASES = [
    "Welcome Letter",
    "Welcome, Architect",
    "How to Use This Guidebook",
    "Architect's Commitment",
    "Chapter One",
    "Chapter I",
    "The Awakening",
    "Founder Closing",
    "About the Founder",
    "Aliveness Index",
    "Decision Statement",
    "Back Half Standards",
    "Architect Identity Statement",
    "Expansion Plan",
    "Back Half Declaration",
    "THE BACK HALF BLUEPRINT",
    "Kimberly M. Walker",
]

FILES = [
    r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\The Back Half_8.5.2026.docx",
    r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\August 2026\The Back Half_8.4.2026.docx",
    r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\August 2026\The Back Half_8.1.2026.docx",
    r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\July 2026\The Back Half_7.31.2026.docx",
    r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\July 2026\The Back Half_7.9.2026.docx",
    r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\Founder Story\Founder Story_7.21.2026.docx",
]

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", ".tmp-blueprint-search")
os.makedirs(OUT_DIR, exist_ok=True)

summary_lines: list[str] = []

for file_path in FILES:
    if not os.path.exists(file_path):
        summary_lines.append(f"MISSING: {file_path}")
        continue

    text = extract_docx(file_path)
    hits = {phrase: text.find(phrase) for phrase in PHRASES if text.find(phrase) >= 0}
    summary_lines.append(f"FILE: {file_path}")
    summary_lines.append(f"LEN: {len(text)}")
    summary_lines.append(f"HITS: {json.dumps(hits, indent=2)}")
    summary_lines.append("")

    base_name = os.path.basename(file_path).replace(".docx", ".txt")
    with open(os.path.join(OUT_DIR, base_name), "w", encoding="utf-8") as handle:
        handle.write(text)

summary_path = os.path.join(OUT_DIR, "summary.txt")
with open(summary_path, "w", encoding="utf-8") as handle:
    handle.write("\n".join(summary_lines))

print(summary_path)
