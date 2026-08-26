from pathlib import Path

RECOVERY = Path(
    r"c:\Users\smyle\OneDrive\Desktop\The Back Half\The Back Half\Launch\04 Website\website\.tmp-blueprint-search"
)
CHAPTER_NAMES = ["One", "Two", "Three", "Four", "Five", "Six", "Seven"]

chapter_num = 7
path = RECOVERY / "recovery" / "sections-v2" / f"chapter-{chapter_num}-8.3.txt"
text = path.read_text(encoding="utf-8")
print("0", text[:30], len(text))

for marker in ("Founder Welcome", "Founder welcome"):
    if marker in text:
        text = text.split(marker, 1)[1]
        print("found founder welcome marker")
        break
else:
    welcome_start = text.find("Welcome")
    print("welcome_start", welcome_start)
    if welcome_start >= 0:
        text = text[welcome_start:]
print("1", text[:30], len(text))

for end in ("Founder Congratulations Video Script", "My Response:"):
    if end in text:
        text = text.split(end)[0]
        print("split on", end, "->", text[:30], len(text))

chapter_end = f"Let's begin Chapter {CHAPTER_NAMES[chapter_num - 1]}."
print("chapter_end repr", repr(chapter_end), "found at", text.find(chapter_end))
if chapter_end in text:
    text = text.split(chapter_end)[0] + chapter_end
print("2 pre-strip", repr(text[:100]))
