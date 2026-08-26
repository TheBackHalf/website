from pathlib import Path

RECOVERY = Path(
    r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\Launch\04 Website\website\.tmp-blueprint-search"
)
CHAPTER_NAMES = ["One", "Two", "Three", "Four", "Five", "Six", "Seven"]

chapter_num = 7
path = RECOVERY / "recovery" / "sections-v2" / f"chapter-{chapter_num}-8.3.txt"
text = path.read_text(encoding="utf-8")
print("start", text[:40])
for end in (
    "Founder Congratulations Video Script",
    "My Response:",
    "Send the next Chapter welcome",
):
    if end in text:
        text = text.split(end)[0]
        print(f"after {end!r}", text[:40], "len", len(text))
chapter_end = f"Let's begin Chapter {CHAPTER_NAMES[chapter_num - 1]}."
print("chapter_end", chapter_end, "found", chapter_end in text)
if chapter_end in text:
    text = text.split(chapter_end)[0] + chapter_end
print("final start", text[:80])

import importlib.util
spec = importlib.util.spec_from_file_location(
    "b",
    r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\Launch\04 Website\website\scripts\build-manuscript-from-sources.py",
)
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)
print("after strip", b.strip_session_noise(text)[:80])
print("load_recovery", b.load_recovery_welcome(7)[:80])
