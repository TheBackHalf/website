"""
Build Row 46 manuscript modules from recovered founder-approved sources.
Run: python scripts/build-manuscript-from-sources.py
"""
from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(r"c:\Users\smyle\OneDrive\Desktop\The Back Half")
REPO = ROOT / "The Back Half" / "Launch" / "04 Website" / "website"
OUT = REPO / "content" / "blueprint" / "manuscript" / "generated"
RECOVERY = REPO / ".tmp-blueprint-search"
W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

PATHS = {
    "8.1": ROOT / "The Back Half" / "The Foundry" / "August 2026" / "The Back Half_8.1.2026.docx",
    "8.3": ROOT / "The Back Half" / "The Foundry" / "August 2026" / "The Back Half_8.3.2026.docx",
    "8.4": ROOT / "The Back Half" / "The Foundry" / "The Back Half_8.4.2026.docx",
    "aliveness": ROOT / "The Back Half" / "Assets" / "The Aliveness Project_6.28.2026.docx",
    "mirror": ROOT / "The Back Half" / "Assets" / "The Back Half Mirror_7.1.2026.docx",
    "standards": ROOT / "The Back Half" / "Assets" / "The Standards Exercise_6.30.2026.docx",
    "decision_ladder": ROOT / "The Back Half" / "Assets" / "The Decision Ladder_7.1.2026.xlsx",
    "three_lives": ROOT / "The Back Half" / "Assets" / "The Three Lives Exercise_6.30.2026.docx",
}

CHAPTER_NAMES = [
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
]

CHAPTER_NEXT = [
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
]

APPROVED_ARCHITECTS_COMMITMENT = [
    "THE ARCHITECT'S COMMITMENT",
    "I choose to become the Architect of my life.",
    "I accept full responsibility for the life I create from this moment forward.",
    "I will no longer allow expectation, habit, fear, circumstance, or the passage of time to determine who I become.",
    "I will live intentionally.",
    "I will make decisions that honor the person I am becoming, protect what makes me feel alive, and move me toward a life of fullness, purpose, and possibility.",
    "I will have the courage to release what no longer belongs in my life and the discipline to build what does.",
    "I will treat my time, energy, health, relationships, environment, resources, gifts, and dreams as things worthy of intentional stewardship.",
    "I will not wait for permission to change my life.",
    "I will not confuse familiarity with fulfillment.",
    "I will not settle for a life that looks acceptable but does not feel alive.",
    "I understand that creating my Back Half will require decisions. It will require courage. It will require action. And it will require me to take 100% accountability for my life.",
    "I accept that responsibility.",
    "I choose intention over expectation.",
    "I choose possibility over resignation.",
    "I choose aliveness over autopilot.",
    "I choose to live in my fullness.",
    "Magical is possible.",
    "And I commit to intentionally creating it.",
    "I am the Architect.",
    "Signature: ______________________________",
    "Date: ______________________________",
]


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


def load_text(key: str) -> str:
    path = PATHS[key]
    return extract_xlsx(path) if path.suffix == ".xlsx" else extract_docx(path)


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


def strip_session_noise(text: str) -> str:
    for marker in (
        "My Response:",
        "AI Kimberly",
        "Approve?",
        "Guidebook Written Content Status:",
        "What's next?",
        "What\u2019s next?",
        "Send the ",
        "Status: Ready for Founder Approval",
        "Video ",
    ):
        if marker in text:
            text = text.split(marker)[0]
    text = re.sub(r"Script\s*$", "", text.strip())
    return text.strip()


def strip_personal_exercise_answers(text: str) -> str:
    """Remove founder-filled worksheet answers; keep prompts only."""
    for marker in (
        "Question 1:",
        "Question 2:",
        "Question 3:",
        "Question 4:",
        "Question 5:",
        "Step 1:",
        "Step 2:",
        "You do step 3",
    ):
        if marker in text:
            text = text.split(marker)[0]
    return text.strip()


def normalize_whitespace(text: str) -> str:
    text = text.replace("\r", " ").replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def split_paragraphs(text: str) -> list[str]:
    text = strip_session_noise(text)
    text = normalize_whitespace(text)
    if not text:
        return []

    # Split on sentence boundaries while preserving list-like segments.
    parts: list[str] = []
    buffer = ""
    for segment in re.split(r"(?<=[.!?])\s+(?=[A-Z\"'(])", text):
        segment = segment.strip()
        if not segment:
            continue
        if re.match(r"^[A-Z][a-z]+ [A-Z]", segment) and len(segment) < 80:
            if buffer:
                parts.append(buffer.strip())
                buffer = ""
            parts.append(segment)
            continue
        buffer = f"{buffer} {segment}".strip() if buffer else segment
    if buffer:
        parts.append(buffer.strip())
    return parts


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def write_ts(name: str, paragraphs: list[str]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    safe_name = name.replace("-", "_") if name.startswith("chapter-") else name
    lines = ["export const paragraphs = ["]
    for paragraph in paragraphs:
        lines.append(f"  {ts_string(paragraph)},")
    lines.append("] as const;")
    lines.append("")
    export_name = safe_name if safe_name == name else name.replace("-", "_")
    if name.startswith("chapter-"):
        export_name = name.replace("-", "_")
    lines.append(f"export const {export_name} = {{ paragraphs }};")
    lines.append("")
    (OUT / f"{name}.ts").write_text("\n".join(lines), encoding="utf-8")


def load_recovery_welcome(chapter_num: int) -> str:
    path = RECOVERY / "recovery" / "sections-v2" / f"chapter-{chapter_num}-8.3.txt"
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8")
    chapter_label = CHAPTER_NAMES[chapter_num - 1]
    specific_markers = (
        f"Chapter {chapter_label} \u2014 Founder Welcome",
        f"Chapter {chapter_label} — Founder Welcome",
        "Founding Architect Welcome",
    )
    for marker in specific_markers:
        if marker in text:
            text = text.split(marker, 1)[1]
            break
    else:
        welcome_start = text.find("Welcome back")
        if welcome_start < 0:
            welcome_start = text.find("Welcome,")
        if welcome_start >= 0:
            text = text[welcome_start:]
    for end in ("Founder Congratulations Video Script", "My Response:"):
        if end in text:
            text = text.split(end)[0]
    chapter_end = f"Let's begin Chapter {CHAPTER_NAMES[chapter_num - 1]}."
    if chapter_end in text:
        text = text.split(chapter_end)[0] + chapter_end
    return strip_session_noise(text)


def load_congratulations_script() -> str:
    path = RECOVERY / "recovery" / "sections-v2" / "chapter-7-8.3.txt"
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8")
    start = text.find("Founder Congratulations Video Script")
    if start < 0:
        start = text.find("Congratulations, Architect.")
    if start < 0:
        return ""
    text = text[start:]
    if "Founder Congratulations Video Script" in text:
        text = text.split("Founder Congratulations Video Script", 1)[1]
    for end in ("My Response:", "Website Image Library"):
        if end in text:
            text = text.split(end)[0]
            break
    return strip_session_noise(text)


def load_asset_prompt(path_key: str, stop_markers: tuple[str, ...]) -> str:
    path = PATHS[path_key]
    text = load_text(path_key)
    audit_path = RECOVERY / "assets-audit" / f"{path.name.replace('.xlsx', '.txt').replace('.docx', '.txt')}"
    if audit_path.exists():
        text = audit_path.read_text(encoding="utf-8")
    for marker in stop_markers:
        if marker in text:
            text = text.split(marker)[0]
    return strip_session_noise(text)


def load_decision_ladder() -> str:
    path = PATHS["decision_ladder"]
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("xl/sharedStrings.xml")
    root = ET.fromstring(xml)
    strings = [t.text for t in root.iter(f"{W_NS}t") if t.text]
    return strip_session_noise(" ".join(strings))


def clean_chapter_intro(text: str) -> str:
    text = re.sub(r"^:\s*[^W]+Welcome", "Welcome", text)
    text = re.sub(r"^:\s*", "", text)
    return strip_session_noise(text)


def chapter_welcome(text: str, chapter_num: int) -> str | None:
    num = chapter_num
    markers = [
        f"Chapter {CHAPTER_NAMES[num - 1]} \u2014 Founder Welcome",
        f"Chapter {CHAPTER_NAMES[num - 1]} — Founder Welcome",
    ]
    end_markers = [
        f"Chapter {CHAPTER_NEXT[num - 1]} \u2014 Founder Welcome",
        f"Chapter {CHAPTER_NEXT[num - 1]} — Founder Welcome",
        "Completion Certificate",
        "Founder Congratulations Video Script",
        "My Response:",
    ]
    for start in markers:
        for end in end_markers:
            block = slice_text(text, start, end)
            if block:
                return strip_session_noise(block)
    return None


def chapter_intro(chapter_num: int, t84: str) -> str:
    slug_map = {
        1: "chapter-1-awakening",
        2: "chapter-2-mirror",
        3: "chapter-3-decision",
        4: "chapter-4-standards",
        5: "chapter-5-architect",
        6: "chapter-6-expansion",
        7: "chapter-7-beginning",
    }
    recovery_path = RECOVERY / "recovery" / "sections" / f"{slug_map[chapter_num]}.txt"
    if recovery_path.exists():
        intro = clean_chapter_intro(recovery_path.read_text(encoding="utf-8"))
        for tail in ("Architect ResourcesThe", "Architect Resources"):
            if tail in intro:
                intro = intro.split(tail)[0]
        return intro.strip()
    current = CHAPTER_NAMES[chapter_num - 1]
    nxt = CHAPTER_NEXT[chapter_num - 1]
    if chapter_num == 7:
        block = slice_text(t84, "The BeginningYour Journey", "Aliveness Index")
    else:
        block = slice_text(t84, f"Chapter {current}", f"Chapter {nxt}")
    return clean_chapter_intro(block or "")


def main() -> None:
    t81 = load_text("8.1")
    t83_path = RECOVERY / "recovery" / "The_Back_Half_The_Foundry_August_2026_The_Back_Half_8_3_2026_docx.txt"
    t83 = t83_path.read_text(encoding="utf-8") if t83_path.exists() else load_text("8.3")
    t84 = load_text("8.4")

    title = "The Back Half Blueprint"
    subtitle = (
        "A Seven-Chapter Journey to Intentionally Create a Life of "
        "Fullness, Purpose, and Possibility"
    )

    copyright_block = slice_text(
        t81,
        "CopyrightThe Back Half Blueprint",
        "Table of Contents",
    )
    copyright_block = (copyright_block or "").replace("thebackhalf.com", "thebackhalf.org")

    how_to_use = slice_text(
        t81,
        "How to Use This GuidebookWelcome, Architect.",
        "My Response: Approved",
    )

    welcome_letter = slice_text(
        t83,
        "Founding Architect WelcomeWelcome, {First Name}.",
        "My Response:",
    )
    welcome_signoff = slice_text(t84, "Welcome, Architect.", "My Response:")

    founder_closing = slice_text(
        t81,
        "A Letter from the FounderDear Architect,",
        "Next: About the Founder",
    )

    about_founder = slice_text(
        t81,
        "Send the About the FounderAbout the Founder",
        "Guidebook Written Content Status:",
    )

    certificate_text = (
        "This certifies that {Architect Name} has successfully completed "
        "The Back Half Blueprint and has demonstrated a commitment to intentionally "
        "creating a life of fullness, purpose, and possibility."
    )

    aliveness_index = slice_text(t81, "The Aliveness Index\u2122Before You Begin", "My Response:ApprovedBefore we go further")
    if not aliveness_index:
        aliveness_index = slice_text(t81, "The Aliveness Index\u2122Before You Begin", "My Response:Approved")

    decision_statement = slice_text(t81, "Decision StatementBefore You Begin", "My Response:")
    back_half_standards = slice_text(t81, "Back Half StandardsBefore You Begin", "My Response:")
    architect_identity = slice_text(t81, "Architect Identity StatementBefore You Begin", "My Response:")
    expansion_plan = slice_text(t81, "Expansion PlanBefore You Begin", "My Response:")
    back_half_declaration = slice_text(t81, "Back Half DeclarationBefore You Sign", "Founder Closing")

    exercise_sources = {
        1: load_asset_prompt("aliveness", ("Question 1:",)),
        2: load_asset_prompt("mirror", ("Back Half Mirror Responses:", "Step 1:")),
        3: load_decision_ladder(),
        4: load_asset_prompt("standards", ("9 Areas from Audit:", "Low vibration")),
        5: load_asset_prompt("three_lives", ("Person 1:Before", "Person 1:")),
        6: "",
        7: "",
    }

    congratulations = load_congratulations_script()

    write_ts("title", [title])
    write_ts("subtitle", [subtitle])
    write_ts("copyright", split_paragraphs(copyright_block or ""))

    welcome_parts: list[str] = []
    if welcome_letter:
        welcome_parts.extend(split_paragraphs(strip_session_noise(welcome_letter)))
    if welcome_signoff:
        welcome_parts.extend(split_paragraphs(strip_session_noise(welcome_signoff)))
    write_ts("welcomeLetter", welcome_parts)

    write_ts("howToUse", split_paragraphs(how_to_use or ""))

    # Founder-approved pledge (Aug 2026) — preserve verbatim on rebuild.
    write_ts("architectsCommitment", APPROVED_ARCHITECTS_COMMITMENT)

    write_ts("aboutFounder", split_paragraphs(about_founder or ""))
    write_ts("founderClosing", split_paragraphs(founder_closing or ""))
    write_ts("certificate", split_paragraphs(certificate_text))

    chapter_keys = [
        "chapter-1-awakening",
        "chapter-2-mirror",
        "chapter-3-decision",
        "chapter-4-standards",
        "chapter-5-architect",
        "chapter-6-expansion",
        "chapter-7-beginning",
    ]

    for idx, key in enumerate(chapter_keys, start=1):
        parts: list[str] = []
        welcome = load_recovery_welcome(idx) or chapter_welcome(t83, idx) or ""
        if welcome:
            parts.extend(split_paragraphs(welcome))
        intro = chapter_intro(idx, t84)
        if intro:
            parts.extend(split_paragraphs(clean_chapter_intro(intro)))
        exercise = exercise_sources.get(idx, "")
        if exercise:
            parts.extend(split_paragraphs(exercise))
        if idx == 7 and congratulations:
            parts.extend(split_paragraphs(congratulations))
        write_ts(key, parts)

    write_ts("alivenessIndex", split_paragraphs(aliveness_index or ""))
    write_ts("decisionStatement", split_paragraphs(decision_statement or ""))
    write_ts("backHalfStandards", split_paragraphs(back_half_standards or ""))
    write_ts("architectIdentityStatement", split_paragraphs(architect_identity or ""))
    write_ts("expansionPlan", split_paragraphs(expansion_plan or ""))
    write_ts("backHalfDeclaration", split_paragraphs(back_half_declaration or ""))

    print(f"Wrote manuscript modules to {OUT}")


if __name__ == "__main__":
    main()
