"""Write raw slices from Foundry docx for manual boundary verification."""
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
OUT = Path(__file__).resolve().parent.parent / ".tmp-blueprint-search" / "raw-slices"
OUT.mkdir(parents=True, exist_ok=True)


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


def write_slice(name: str, text: str, start: int, end: int | None) -> None:
    chunk = text[start:end] if end else text[start:]
    (OUT / f"{name}.txt").write_text(chunk, encoding="utf-8")
    print(name, len(chunk))


files = {
    "8.1": Path(
        r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\August 2026\The Back Half_8.1.2026.docx"
    ),
    "8.4": Path(
        r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\The Foundry\The Back Half_8.4.2026.docx"
    ),
}

texts = {k: extract_docx(p) for k, p in files.items()}

# 8.1 markers
for label, start_marker, end_marker in [
    ("8.1-welcome-full", "Welcome, Architect", "How to Use This Guidebook"),
    ("8.1-how-to-use", "Send the How to Use", "Architect's Commitment"),
    ("8.1-commitment", "Send the Architect's Commitment", "Chapter One"),
    ("8.1-founder-closing", "Send the Founder Closing", "About the Founder"),
    ("8.1-about-founder", "Send the About the Founder", "Aliveness Index"),
    ("8.1-copyright", "Send the Copyright", "Table of Contents"),
    ("8.1-toc", "Send the Table of Contents", "Welcome"),
]:
    t = texts["8.1"]
    s = t.find(start_marker)
    if s < 0:
        s = t.find(start_marker.replace("Send the ", ""))
    e = t.find(end_marker, s + 1) if s >= 0 else -1
    if s >= 0:
        write_slice(label, t, s, e if e > s else None)

# 8.4 chapters
for n, start_marker, end_marker in [
    (1, "Send Chapter One", "Send Chapter Two"),
    (2, "Send Chapter Two", "Send Chapter Three"),
    (3, "Send Chapter Three", "Send Chapter Four"),
    (4, "Send Chapter Four", "Send Chapter Five"),
    (5, "Send Chapter Five", "Send Chapter Six"),
    (6, "Send Chapter Six", "Send Chapter Seven"),
    (7, "Send Chapter Seven", "Aliveness Index"),
]:
    t = texts["8.4"]
    s = t.find(start_marker)
    e = t.find(end_marker, s + 1) if s >= 0 else -1
    if s >= 0:
        write_slice(f"8.4-chapter-{n}", t, s, e if e > s else None)

# 8.4 welcome
for label, start_marker, end_marker in [
    ("8.4-welcome", "Send the Welcome", "How to Use"),
    ("8.4-about-founder", "Send the About the Founder", "Aliveness Index"),
]:
    t = texts["8.4"]
    s = t.find(start_marker)
    e = t.find(end_marker, s + 1) if s >= 0 else -1
    if s >= 0:
        write_slice(label, t, s, e if e > s else None)
