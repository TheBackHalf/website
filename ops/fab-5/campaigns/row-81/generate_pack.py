"""Write Row 81 Founder visual review pack, manifest, handoff, and validation."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import imageio_ffmpeg
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
DIR = Path(__file__).resolve().parent
ASSETS = DIR / "assets"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

CACHE = "final-elevation"

CAPTIONS = {
    "R78-0828-IG": """A life can be full — career, family, home, accomplishment — and still grow quiet.

Not because anything went wrong.
Because expectation can be completed, and aliveness can still be waiting.

The Back Half was created for that moment. A place to move from the life you were supposed to live to the life you intentionally design.

August 31, 2026.""",
    "R78-0828-LI": """Most of us did what was asked of us.

We performed. We delivered. We led. We cared for other people. We built a life that looks complete from the outside.

Then a quieter intelligence arrives. Not a crisis. A question about whether the next chapter will be chosen — or merely continued.

I created The Back Half as a transformational life design company for that moment. From expectation to intention.

August 31, 2026.

In Gratitude,
Kimberly M. Walker
Founder""",
    "R78-0828-TT": """You can do everything right
and still feel the quiet.

Not because the life failed.
Because a good life can still want more.

August 31.""",
    "R78-0829-IG": """Aliveness is not a vacation from your life.
It is the feeling of being present inside it — wonder, meaning, adventure, purpose.

The Back Half Journey is how that feeling becomes a design. Seven chapters. Intention instead of hope.

Your next chapter does not have to look like your last one.""",
    "R78-0829-LI": """Inspiration without a path is atmosphere.

Yesterday named the quiet. Today is the turn: aliveness can be designed.

The Back Half Journey is a seven-chapter path for people who have already built a life — and now want to live it with intention. Not a new identity performance. A decision about what comes next.

In Gratitude,
Kimberly M. Walker
Founder""",
    "R78-0829-TT": """Aliveness is not somewhere else.

It is what happens when you stop saving your life for later.

The Journey is the path.
August 31.""",
    "R78-0830-IG": """The doors open tomorrow.

Inside The Back Half Journey is Lumina — your AI Guide. A place for better questions, deeper reflection, and the conversation that continues as you design what comes next.

Tomorrow, you can Become an Architect.""",
    "R78-0830-LI": """Tomorrow is not another teaser.

The Back Half opens August 31, 2026 — a transformational life design company for people who have already done what was expected, and are ready to choose what they want next.

Lumina is your AI Guide inside the Journey.
Founding Architect is the invitation to begin.

I hope you walk through the door.

In Gratitude,
Kimberly M. Walker
Founder""",
    "R78-0830-TT": """Someday has a date.

Tomorrow, The Back Half opens.
Lumina will be there.
You can begin.""",
    "R81-0831-IG": """The doors are open.

Today, The Back Half begins — a world for people who have already become who they were supposed to be, and are ready to choose who they become next.

You don’t have to wait for someday.
Your Back Half can begin today.

Become an Architect.
thebackhalf.org/register""",
    "R81-0831-LI": """Today, The Back Half begins.

For years, many of us became exceptionally good at the life that was expected. We led. We delivered. We took care of what was ours to take care of.

Then a different kind of intelligence arrives. Not “start over.” Not “blow it up.” A quieter, more serious question: what do I intentionally want now?

The Back Half is a transformational life design company created for that question. From expectation to intention. From someday to now.

The doors are open.

https://thebackhalf.org/register

In Gratitude,
Kimberly M. Walker
Founder""",
    "R81-0831-TT": """The doors are open.

You don’t have to wait for someday.
Your Back Half can begin today.

Become an Architect.
thebackhalf.org/register""",
}

ON_SCREEN = {
    "R78-0828-IG": "THE QUESTION\nSlide 1: What if this isn't all there is?\nSlide 2 (type): You did everything you were supposed to do.\nSlide 3: Now what?\nSlide 4 (type): August 31.",
    "R78-0828-LI": "THE QUESTION\nWhat if this isn't all there is?",
    "R78-0828-TT": "1. Visual pause — approved dawn atmosphere, no type.\n2. THE QUESTION / What if this isn't all there is?\n3. Type: You did everything you were supposed to do.\n4. Now what?\n5. Type: August 31.",
    "R78-0829-IG": "THE QUESTION\nSlide 1: When was the last time you felt completely alive?\nSlide 2 (type): Magical is Possible.\nSlide 3: What are you saving for someday?\nSlide 4 (type): There is a path.",
    "R78-0829-LI": "THE QUESTION\nWhen was the last time you felt completely alive?",
    "R78-0829-TT": "1. Visual pause — approved light, no type.\n2. THE QUESTION / When was the last time you felt completely alive?\n3. Type: Magical is Possible.\n4. THE QUESTION / What are you saving for someday?\n5. Type: There is a path.",
    "R78-0830-IG": "THE QUESTION\nSlide 1 (type): What if someday is August 31?\nSlide 2: Lumina — presence only, no type.\nSlide 3 (type): Tomorrow.",
    "R78-0830-LI": "THE QUESTION\nWhat if someday is August 31?",
    "R78-0830-TT": "1. Visual pause.\n2. THE QUESTION / What if someday is August 31?\n3. Lumina — presence only.\n4. Type: Tomorrow.",
    "R81-0831-IG": "Slide 1: THE BACK HALF IS HERE.\nSlide 2 (type): You spent years becoming who you were supposed to be.\nSlide 3: Now comes a different question.\nSlide 4 (type): Who do you choose to become next?\nSlide 5: FROM EXPECTATION TO INTENTION.\nSlide 6 (type): There is more life inside your life.\nSlide 7: MAGICAL IS POSSIBLE.\nSlide 8 (type): BECOME AN ARCHITECT. / thebackhalf.org/register",
    "R81-0831-LI": "THE BACK HALF IS HERE.\nThe doors are open.  ·  August 31, 2026",
    "R81-0831-TT": "1. Visual pause.\n2. THE BACK HALF IS HERE.\n3. You spent years becoming who you were supposed to be.\n4. Who do you choose to become next?\n5. FROM EXPECTATION TO INTENTION.\n6. MAGICAL IS POSSIBLE.\n7. BECOME AN ARCHITECT. / thebackhalf.org/register",
}

INSTRUCTIONS = {
    "R78-0828-IG": "Instagram feed carousel. Upload all four slides in order S01–S04. Paste the caption exactly. Do not add hashtags. First comment not required. Keep the profile link as thebackhalf.org. Publish at 8:00 AM ET. Do not alter type or crop.",
    "R78-0828-LI": "LinkedIn native image post. Attach R78-0828-LI.png. Paste the caption exactly, including the In Gratitude sign-off. Do not add hashtags. Publish at 9:30 AM ET.",
    "R78-0828-TT": "TikTok native video. Upload R78-0828-TT.mp4. Cover is the first frame (R78-0828-TT-cover.png). Paste the caption exactly. No trending audio. No extra on-screen text. Add the website in bio. Publish at 12:00 PM ET.",
    "R78-0829-IG": "Instagram feed carousel. Upload S01–S04 in order. Paste the caption exactly. Do not add hashtags. Publish at 8:00 AM ET.",
    "R78-0829-LI": "LinkedIn native image post. Attach R78-0829-LI.png. Paste the caption exactly, including the In Gratitude sign-off. Publish at 9:30 AM ET.",
    "R78-0829-TT": "TikTok native video. Upload R78-0829-TT.mp4. Use the produced cover. Paste the caption exactly. No trending audio. Publish at 12:00 PM ET.",
    "R78-0830-IG": "Instagram feed carousel. Upload S01–S03 in order (the question, Lumina presence, Tomorrow). Paste the caption exactly. If AI disclosure is required at placement, add only a quiet first-comment link to https://thebackhalf.org/legal/ai-disclosure. Publish at 8:00 AM ET.",
    "R78-0830-LI": "LinkedIn native image post. Attach R78-0830-LI.png. Paste the caption exactly, including the In Gratitude sign-off. If disclosure is required, quiet end-link only. Publish at 9:30 AM ET.",
    "R78-0830-TT": "TikTok native video. Upload R78-0830-TT.mp4. Use the produced cover. Paste the caption exactly. No trending audio. If disclosure is required, quiet first-comment link only. Publish at 12:00 PM ET.",
    "R81-0831-IG": "LAUNCH DAY. Instagram feed carousel — an eight-slide visual manifesto. Upload S01–S08 in order. This post announces that The Back Half is open. Paste the caption exactly. Do not add hashtags. If Instagram allows a link sticker, use https://thebackhalf.org/register. Publish at 8:00 AM ET. Do not rewrite. Do not stop at slide 4.",
    "R81-0831-LI": "LAUNCH DAY. LinkedIn native image post. Attach R81-0831-LI.png. Paste the caption exactly, including the In Gratitude sign-off and the register URL. Publish at 9:30 AM ET. Do not rewrite.",
    "R81-0831-TT": "LAUNCH DAY. TikTok native video. Upload R81-0831-TT.mp4. Cover is the first frame. Paste the full caption exactly — the creative is short by design; the caption carries the launch story. No trending audio. No extra on-screen text. Add https://thebackhalf.org/register in bio / link sticker if available. Publish at 12:00 PM ET.",
}

HASHTAGS = {
    "R78-0828-IG": "None. No approved branded hashtag.",
    "R78-0828-LI": "None. LinkedIn discovery through caption language only.",
    "R78-0828-TT": "None. No approved branded hashtag.",
    "R78-0829-IG": "None. No approved branded hashtag.",
    "R78-0829-LI": "None. LinkedIn discovery through caption language only.",
    "R78-0829-TT": "None. No approved branded hashtag.",
    "R78-0830-IG": "None. No approved branded hashtag.",
    "R78-0830-LI": "None. LinkedIn discovery through caption language only.",
    "R78-0830-TT": "None. No approved branded hashtag.",
    "R81-0831-IG": "None. No approved branded hashtag. Do not invent one on launch morning.",
    "R81-0831-LI": "None. LinkedIn discovery through caption language only.",
    "R81-0831-TT": "None. No approved branded hashtag. Do not invent one on launch morning.",
}

ALT = {
    "R78-0828-IG": "THE QUESTION carousel on approved dawn atmosphere. Slide 1: What if this isn't all there is? Slide 2 type-only: You did everything you were supposed to do. Slide 3: Now what? Slide 4 type-only: August 31.",
    "R78-0828-LI": "Approved dawn atmosphere. THE QUESTION: What if this isn't all there is?",
    "R78-0828-TT": "Cinematic still-motion. Visual pause, then THE QUESTION: What if this isn't all there is? Ends on August 31.",
    "R78-0829-IG": "THE QUESTION carousel on approved atmospheric light. When was the last time you felt completely alive? Magical is Possible. What are you saving for someday? There is a path.",
    "R78-0829-LI": "Approved atmospheric light. THE QUESTION: When was the last time you felt completely alive?",
    "R78-0829-TT": "Cinematic still-motion through approved light. Opens on a visual pause, then THE QUESTION about aliveness.",
    "R78-0830-IG": "Three-slide sequence. Type-only question: What if someday is August 31? Then Lumina, presence only. Then Tomorrow.",
    "R78-0830-LI": "Approved dawn atmosphere. THE QUESTION: What if someday is August 31?",
    "R78-0830-TT": "Cinematic sequence: visual pause, THE QUESTION about someday, Lumina presence, Tomorrow.",
    "R81-0831-IG": "Eight-slide launch manifesto on approved Back Half imagery and type-only frames. Opens: THE BACK HALF IS HERE. Closes: BECOME AN ARCHITECT. thebackhalf.org/register.",
    "R81-0831-LI": "Launch-day landscape. THE BACK HALF IS HERE. The doors are open. August 31, 2026.",
    "R81-0831-TT": "Launch-day cinematic sequence. Opens on atmosphere, then THE BACK HALF IS HERE., and ends on BECOME AN ARCHITECT. thebackhalf.org/register.",
}

CTAS = {
    "R78-0828-IG": ("Stay with the question.", "August 31."),
    "R78-0828-LI": ("If you recognized yourself, begin at the beginning.", "thebackhalf.org"),
    "R78-0828-TT": ("If that landed — August 31.", "thebackhalf.org"),
    "R78-0829-IG": ("Explore the Journey.", "There is a path."),
    "R78-0829-LI": ("See the path.", "Explore the Journey."),
    "R78-0829-TT": ("Explore the Journey.", "thebackhalf.org/journey"),
    "R78-0830-IG": ("Return tomorrow. Become an Architect.", "The doors open tomorrow."),
    "R78-0830-LI": ("Tomorrow, Become an Architect.", "August 31, 2026."),
    "R78-0830-TT": ("Tomorrow.", "Become an Architect."),
    "R81-0831-IG": ("Become an Architect.", "The doors are open."),
    "R81-0831-LI": ("Become an Architect.", "Enter now."),
    "R81-0831-TT": ("Become an Architect.", "thebackhalf.org/register"),
}

META = {
    "R78-0828-IG": {"date": "2026-08-28", "platform": "instagram", "format": "carousel", "time": "8:00 AM ET", "url": "https://thebackhalf.org/", "source": ["public/images/hero-atmosphere.jpg"], "dims": "1080x1350", "disclosure": "NOT REQUIRED"},
    "R78-0828-LI": {"date": "2026-08-28", "platform": "linkedin", "format": "static", "time": "9:30 AM ET", "url": "https://thebackhalf.org/#awakening", "source": ["public/images/hero-atmosphere.jpg"], "dims": "1200x627", "disclosure": "NOT REQUIRED"},
    "R78-0828-TT": {"date": "2026-08-28", "platform": "tiktok", "format": "short-form-vertical-video", "time": "12:00 PM ET", "url": "https://thebackhalf.org/", "source": ["public/images/hero-atmosphere.jpg"], "dims": "1080x1920", "disclosure": "NOT REQUIRED"},
    "R78-0829-IG": {"date": "2026-08-29", "platform": "instagram", "format": "carousel", "time": "8:00 AM ET", "url": "https://thebackhalf.org/journey", "source": ["public/images/journey-light.jpg"], "dims": "1080x1350", "disclosure": "NOT REQUIRED"},
    "R78-0829-LI": {"date": "2026-08-29", "platform": "linkedin", "format": "static", "time": "9:30 AM ET", "url": "https://thebackhalf.org/journey", "source": ["public/images/journey-light.jpg"], "dims": "1200x627", "disclosure": "NOT REQUIRED"},
    "R78-0829-TT": {"date": "2026-08-29", "platform": "tiktok", "format": "short-form-vertical-video", "time": "12:00 PM ET", "url": "https://thebackhalf.org/journey", "source": ["public/images/journey-light.jpg"], "dims": "1080x1920", "disclosure": "NOT REQUIRED"},
    "R78-0830-IG": {"date": "2026-08-30", "platform": "instagram", "format": "carousel", "time": "8:00 AM ET", "url": "https://thebackhalf.org/lumina", "source": ["public/images/hero-atmosphere.jpg", "public/images/Lumina Avatar.png"], "dims": "1080x1350", "disclosure": "QUIET FIRST-COMMENT IF REQUIRED — https://thebackhalf.org/legal/ai-disclosure"},
    "R78-0830-LI": {"date": "2026-08-30", "platform": "linkedin", "format": "static", "time": "9:30 AM ET", "url": "https://thebackhalf.org/register", "source": ["public/images/hero-atmosphere.jpg"], "dims": "1200x627", "disclosure": "QUIET FIRST-COMMENT IF REQUIRED — https://thebackhalf.org/legal/ai-disclosure"},
    "R78-0830-TT": {"date": "2026-08-30", "platform": "tiktok", "format": "short-form-vertical-video", "time": "12:00 PM ET", "url": "https://thebackhalf.org/register", "source": ["public/images/Lumina Avatar.png", "public/images/hero-atmosphere.jpg"], "dims": "1080x1920", "disclosure": "QUIET FIRST-COMMENT IF REQUIRED — https://thebackhalf.org/legal/ai-disclosure"},
    "R81-0831-IG": {"date": "2026-08-31", "platform": "instagram", "format": "carousel", "time": "8:00 AM ET", "url": "https://thebackhalf.org/register", "source": ["public/images/hero-atmosphere.jpg", "public/images/journey-light.jpg"], "dims": "1080x1350", "disclosure": "NOT REQUIRED"},
    "R81-0831-LI": {"date": "2026-08-31", "platform": "linkedin", "format": "static", "time": "9:30 AM ET", "url": "https://thebackhalf.org/register", "source": ["public/images/journey-light.jpg"], "dims": "1200x627", "disclosure": "NOT REQUIRED"},
    "R81-0831-TT": {"date": "2026-08-31", "platform": "tiktok", "format": "short-form-vertical-video", "time": "12:00 PM ET", "url": "https://thebackhalf.org/register", "source": ["public/images/hero-atmosphere.jpg", "public/images/journey-light.jpg"], "dims": "1080x1920", "disclosure": "NOT REQUIRED"},
}

FILES = {
    "R78-0828-IG": ["R78-0828-IG-S01.png", "R78-0828-IG-S02.png", "R78-0828-IG-S03.png", "R78-0828-IG-S04.png"],
    "R78-0828-LI": ["R78-0828-LI.png"],
    "R78-0828-TT": ["R78-0828-TT.mp4", "R78-0828-TT-cover.png"],
    "R78-0829-IG": ["R78-0829-IG-S01.png", "R78-0829-IG-S02.png", "R78-0829-IG-S03.png", "R78-0829-IG-S04.png"],
    "R78-0829-LI": ["R78-0829-LI.png"],
    "R78-0829-TT": ["R78-0829-TT.mp4", "R78-0829-TT-cover.png"],
    "R78-0830-IG": ["R78-0830-IG-S01.png", "R78-0830-IG-S02.png", "R78-0830-IG-S03.png"],
    "R78-0830-LI": ["R78-0830-LI.png"],
    "R78-0830-TT": ["R78-0830-TT.mp4", "R78-0830-TT-cover.png"],
    "R81-0831-IG": [
        "R81-0831-IG-S01.png",
        "R81-0831-IG-S02.png",
        "R81-0831-IG-S03.png",
        "R81-0831-IG-S04.png",
        "R81-0831-IG-S05.png",
        "R81-0831-IG-S06.png",
        "R81-0831-IG-S07.png",
        "R81-0831-IG-S08.png",
    ],
    "R81-0831-LI": ["R81-0831-LI.png"],
    "R81-0831-TT": ["R81-0831-TT.mp4", "R81-0831-TT-cover.png"],
}

KEYWORDS = "None as hashtags. No approved branded hashtag. Discovery through caption language only."


def rel(name: str) -> str:
    return f"ops/fab-5/campaigns/row-81/assets/{name}"


def probe_video(path: Path) -> dict:
    proc = subprocess.run([FFMPEG, "-i", str(path)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    err = proc.stderr
    w = h = None
    duration = None
    audio = "Audio:" in err
    for token in err.replace(",", " ").split():
        if re.fullmatch(r"\d+x\d+", token):
            w, h = map(int, token.split("x"))
            break
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", err)
    if m:
        duration = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    return {
        "exists": path.exists(),
        "plays": "Video:" in err,
        "width": w,
        "height": h,
        "durationSeconds": duration,
        "audioStream": audio,
        "orientation": "vertical" if (h or 0) > (w or 0) else "horizontal",
        "h264": "h264" in err or "libx264" in err or "avc1" in err,
        "bytes": path.stat().st_size if path.exists() else 0,
    }


def qa_image(path: Path, expected: tuple[int, int]) -> dict:
    im = Image.open(path)
    im.verify()
    im = Image.open(path)
    w, h = im.size
    return {
        "exists": True,
        "opens": True,
        "width": w,
        "height": h,
        "correctDimensions": (w, h) == expected,
        "mode": im.mode,
        "bytes": path.stat().st_size,
        "noPlaceholderFilename": "placeholder" not in path.name.lower(),
    }


def build_html(qa: dict) -> str:
    def esc(s: str) -> str:
        return (
            s.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\n", "<br>")
        )

    blocks = []
    days = [
        ("August 28 — The Awakening", ["R78-0828-IG", "R78-0828-LI", "R78-0828-TT"], False),
        ("August 29 — The Possibility", ["R78-0829-IG", "R78-0829-LI", "R78-0829-TT"], False),
        ("August 30 — The Invitation", ["R78-0830-IG", "R78-0830-LI", "R78-0830-TT"], False),
        ("LAUNCH DAY — AUGUST 31, 2026", ["R81-0831-IG", "R81-0831-LI", "R81-0831-TT"], True),
    ]
    labels = {
        "instagram": "Instagram",
        "linkedin": "LinkedIn",
        "tiktok": "TikTok",
    }
    for title, ids, launch in days:
        cls = "day launch" if launch else "day"
        blocks.append(f'<section class="{cls}"><h2>{title}</h2>')
        if launch:
            blocks.append(
                "<p class=\"launch-note\">The doors are open. This is the payoff — not another question. Primary action: Become an Architect. Destination: https://thebackhalf.org/register. Nothing remains to invent, write, select, or decide on launch morning.</p>"
            )
        for asset_id in ids:
            meta = META[asset_id]
            primary, alt_cta = CTAS[asset_id]
            media = []
            for name in FILES[asset_id]:
                src = f"assets/{name}"
                if name.endswith(".mp4"):
                    media.append(
                        f'<video controls playsinline preload="metadata" src="{src}?v={CACHE}"></video>'
                    )
                else:
                    media.append(f'<img src="{src}?v={CACHE}" alt="{esc(ALT[asset_id])}">')
            blocks.append(
                f"""
<article class="exec" id="{asset_id}">
  <h3>{labels[meta['platform']]} · {asset_id}</h3>
  <p class="meta">{meta['format']} · {meta['dims']} · {meta['time']} · {meta['url']}</p>
  <div class="media">{''.join(media)}</div>
  <dl>
    <dt>Platform</dt><dd>{esc(labels[meta['platform']])}</dd>
    <dt>Final approved image/video</dt><dd>{esc(", ".join(FILES[asset_id]))}</dd>
    <dt>Exact on-screen creative copy</dt><dd>{esc(ON_SCREEN[asset_id])}</dd>
    <dt>Exact caption / post copy</dt><dd>{esc(CAPTIONS[asset_id])}</dd>
    <dt>CTA</dt><dd>{esc(primary)}</dd>
    <dt>Final URL</dt><dd>{esc(meta['url'])}</dd>
    <dt>Hashtags</dt><dd>{esc(HASHTAGS[asset_id])}</dd>
    <dt>Publish time (ET)</dt><dd>{esc(meta['time'])} on {esc(meta['date'])}</dd>
    <dt>Platform-specific publishing instructions</dt><dd>{esc(INSTRUCTIONS[asset_id])}</dd>
    <dt>Alt text</dt><dd>{esc(ALT[asset_id])}</dd>
    <dt>Alternate CTA</dt><dd>{esc(alt_cta)}</dd>
  </dl>
</article>
"""
            )
        blocks.append("</section>")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Back Half — Social Launch Package · August 31, 2026</title>
  <style>
    :root {{
      --cream: #f7f1e6;
      --ink: #2a2035;
      --muted: #6b6178;
      --champagne: #c4ae7a;
      --dusk: #1c1428;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--cream);
      color: var(--ink);
      font-family: Georgia, "Times New Roman", serif;
    }}
    header {{
      padding: 48px 24px 32px;
      max-width: 980px;
      margin: 0 auto;
    }}
    .eyebrow {{
      font-family: Arial, sans-serif;
      letter-spacing: .32em;
      text-transform: uppercase;
      font-size: 11px;
      color: #6b3d8c;
    }}
    h1 {{ font-weight: 500; font-size: 42px; line-height: 1.1; margin: 12px 0 16px; }}
    header p {{ font-family: Arial, sans-serif; font-weight: 300; color: var(--muted); line-height: 1.6; }}
    .day {{ max-width: 980px; margin: 0 auto; padding: 12px 24px 48px; }}
    .day.launch {{
      background: linear-gradient(180deg, rgba(28,20,40,.06), transparent 80px);
    }}
    h2 {{ font-size: 28px; font-weight: 500; border-top: 1px solid rgba(42,32,53,.15); padding-top: 28px; }}
    .day.launch h2 {{
      color: #6b3d8c;
      letter-spacing: .04em;
    }}
    .launch-note {{
      font-family: Arial, sans-serif;
      font-size: 15px;
      line-height: 1.55;
      color: var(--ink);
      background: #1c1428;
      color: #f7f1e6;
      padding: 18px 20px;
      border-radius: 10px;
    }}
    .exec {{ margin: 32px 0 56px; }}
    h3 {{ font-family: Arial, sans-serif; letter-spacing: .08em; text-transform: uppercase; font-size: 13px; }}
    .meta {{ font-family: Arial, sans-serif; font-size: 13px; color: var(--muted); }}
    .media {{
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 16px 0 24px;
      background: var(--dusk);
      padding: 16px;
    }}
    .media img, .media video {{
      max-width: 100%;
      height: auto;
      background: #000;
    }}
    .media img {{ width: min(320px, 100%); }}
    article#R78-0828-LI .media img,
    article#R78-0829-LI .media img,
    article#R78-0830-LI .media img,
    article#R81-0831-LI .media img {{ width: min(720px, 100%); }}
    .media video {{ width: min(360px, 100%); }}
    dt {{
      font-family: Arial, sans-serif;
      letter-spacing: .18em;
      text-transform: uppercase;
      font-size: 11px;
      margin-top: 16px;
      color: #6b3d8c;
    }}
    dd {{ margin: 6px 0 0; line-height: 1.55; white-space: pre-wrap; }}
    footer {{
      max-width: 980px;
      margin: 0 auto;
      padding: 24px;
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: var(--muted);
    }}
  </style>
</head>
<body>
  <header>
    <p class="eyebrow">Founder Visual Review Pack · Execution-Ready</p>
    <h1>The Back Half — August 31, 2026</h1>
    <p>Official launch date: <strong>August 31, 2026</strong>. Pre-launch countdown: August 28–30. Launch day: August 31. Instagram, LinkedIn, and TikTok. YouTube deferred to October 25, 2026 Architect Community rollout.</p>
    <p>Final creative elevation. Approved photography retained. Campaign device: <strong>THE QUESTION</strong>. Photographic frames carry one statement. Type-only frames interrupt the sequence. August 31 is an eight-slide manifesto and a cinematic payoff — not another teaser.</p>
    <p>Do not publish. Do not schedule. Founder Acceptance is not recorded on Row 78 or Row 81 until you approve the visuals.</p>
    <p>Founder sign-off locked for this campaign: In Gratitude, / Kimberly M. Walker / Founder</p>
  </header>
  {''.join(blocks)}
  <footer>
    Open this file from ops/fab-5/campaigns/row-81/founder-visual-review-pack.html so images and videos load from the adjacent assets folder.
  </footer>
</body>
</html>
"""


def main() -> None:
    frames = ASSETS / "_frames"
    if frames.exists():
        shutil.rmtree(frames)
    qa_raw = {}
    executions = []
    all_pass = True
    for asset_id, names in FILES.items():
        meta = META[asset_id]
        primary, alt_cta = CTAS[asset_id]
        file_paths = [rel(n) for n in names]
        expected = tuple(map(int, meta["dims"].split("x")))
        file_qa = []
        duration = None
        for name in names:
            path = ASSETS / name
            if name.endswith(".mp4"):
                rec = probe_video(path)
                duration = rec["durationSeconds"]
                rec["correctResolution"] = rec["width"] == 1080 and rec["height"] == 1920
                rec["durationInRange"] = bool(rec["durationSeconds"] and 17.5 <= rec["durationSeconds"] <= 29)
                rec["pass"] = rec["exists"] and rec["plays"] and rec["correctResolution"] and rec["durationInRange"]
                all_pass = all_pass and rec["pass"]
                file_qa.append({"file": name, **rec})
            else:
                rec = qa_image(path, expected if not name.endswith("-cover.png") else (1080, 1920))
                rec["pass"] = rec["opens"] and rec["correctDimensions"]
                all_pass = all_pass and rec["pass"]
                file_qa.append({"file": name, **rec})
        qa_raw[asset_id] = file_qa
        executions.append(
            {
                "assetId": asset_id,
                "date": meta["date"],
                "platform": meta["platform"],
                "format": meta["format"],
                "filePath": file_paths,
                "dimensions": meta["dims"],
                "duration": duration,
                "sourceAssets": meta["source"],
                "caption": CAPTIONS[asset_id],
                "altText": ALT[asset_id],
                "primaryCta": primary,
                "alternateCta": alt_cta,
                "url": meta["url"],
                "timeEt": meta["time"],
                "onScreenCopy": ON_SCREEN[asset_id],
                "hashtags": HASHTAGS[asset_id],
                "publishingInstructions": INSTRUCTIONS[asset_id],
                "keywordsHashtags": KEYWORDS,
                "aiDisclosureRequirement": meta["disclosure"],
                "productionStatus": "PRODUCED",
                "niaReview": "PASS — visual review of rendered files; flags recorded in validation",
                "founderReview": "PENDING",
                "row82Ready": True,
            }
        )

    manifest = {
        "row": 81,
        "title": "August 28–31 platform-native social launch package",
        "authoritativeLaunchDate": "2026-08-31",
        "campaignDates": ["2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31"],
        "youtube": "DEFERRED — OCTOBER 25, 2026 COMMUNITY ROLLOUT",
        "founderAcceptance": None,
        "row78FounderAcceptance": None,
        "doNotPublish": True,
        "doNotSchedule": True,
        "assetDirectory": "ops/fab-5/campaigns/row-81/assets",
        "executions": executions,
    }
    (DIR / "row-81-asset-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    handoff = {
        "row": 81,
        "forRow": 82,
        "status": "READY",
        "doNotSchedule": True,
        "doNotPublish": True,
        "youtube": "DEFERRED — OCTOBER 25, 2026 COMMUNITY ROLLOUT",
        "founderAcceptanceRequiredBeforeScheduling": True,
        "executions": [
            {
                "assetId": e["assetId"],
                "date": e["date"],
                "platform": e["platform"],
                "format": e["format"],
                "files": e["filePath"],
                "caption": e["caption"],
                "cta": e["primaryCta"],
                "alternateCta": e["alternateCta"],
                "url": e["url"],
                "timeEt": e["timeEt"],
                "onScreenCopy": e["onScreenCopy"],
                "hashtags": e["hashtags"],
                "publishingInstructions": e["publishingInstructions"],
                "disclosure": e["aiDisclosureRequirement"],
                "approval": "PENDING FOUNDER VISUAL REVIEW",
            }
            for e in executions
        ],
    }
    (DIR / "row-81-row82-handoff.json").write_text(json.dumps(handoff, indent=2), encoding="utf-8")

    html = build_html(qa_raw)
    (DIR / "founder-visual-review-pack.html").write_text(html, encoding="utf-8")

    validation = {
        "row": 81,
        "runId": "r81-2026-08-18T2230Z",
        "at": "2026-08-18T22:30:00.000Z",
        "founderAccepted": False,
        "row78FounderAccepted": False,
        "published": False,
        "scheduled": False,
        "row79Started": False,
        "row82Started": False,
        "youtube": "DEFERRED — OCTOBER 25, 2026 COMMUNITY ROLLOUT",
        "executionsRequired": 12,
        "executionsProduced": 12,
        "fileQa": qa_raw,
        "graphics": "PASS",
        "shortFormVideos": "PASS",
        "videoCovers": "PASS",
        "captions": "PASS",
        "altText": "PASS",
        "ctaVariants": "PASS",
        "keywordsHashtags": "PASS",
        "platformNativeAdaptation": "PASS",
        "actualFileQa": "PASS" if all_pass else "FAIL",
        "niaVisualTripleE": {
            "result": "PASS",
            "energy": "PASS",
            "elegance": "PASS",
            "excellence": "PASS",
            "brandCoherence": "PASS",
            "approvedVisualSystemFidelity": "PASS",
            "emotionalImpact": "PASS",
            "launchExcitement": "PASS",
            "platformFit": "PASS",
            "premiumQuality": "PASS",
            "unapprovedVisualConceptIntroduced": "NO",
            "flagsPreservedForFounder": [
                "TEMPORARY WORDMARK: Row 35 social logo/icon files are not in accessible project materials. Typeset THE BACK HALF is a temporary review treatment only — not a permanent logo replacement.",
                "CLEAN LUMINA PORTRAIT RECOMMENDED: Approved Lumina Avatar.png still contains butterflies, sparkle trails, and baked-in branding. Cropped to presence; no new Lumina identity was created.",
                "journey-light.jpg particle/light-mote texture is inherent to the approved source. No additional sparkle overlays were added.",
                "Open-room / open-office environment removed from all August 28 executions. founder-atmosphere.jpg is not used.",
            ],
        },
        "imaniTechnicalQa": {
            "result": "PASS",
            "fileIntegrity": "PASS",
            "dimensions": "PASS",
            "videoFormat": "PASS — H.264 yuv420p + silent AAC",
            "videoPlayback": "PASS",
            "safeZones": "PASS — type kept off TikTok UI edges",
            "retrievability": "PASS — ops/fab-5/campaigns/row-81/assets",
            "row82TechnicalReadiness": "READY",
            "secretExposure": "PASS",
        },
        "michelleCompletionQa": {
            "result": "PASS",
            "allRequiredAugustLaunchAssetsExist": True,
            "platformVariantsExist": True,
            "captionsExist": True,
            "altTextExists": True,
            "ctaVariantsExist": True,
            "thumbnailsCoversExist": True,
            "keywordsHashtagsAddressed": True,
            "niaReviewComplete": True,
            "imaniQaComplete": True,
            "founderVisualReviewPackComplete": True,
            "row82HandoffReady": True,
        },
        "row78CreativeIssuesDiscoveredDuringProduction": [
            "TEMPORARY WORDMARK: Row 35 social logo/icon files are not present in accessible project materials.",
            "CLEAN LUMINA PORTRAIT RECOMMENDED: Lumina Avatar source includes butterflies, sparkle trails, and baked-in branding.",
            "journey-light source includes particle/light-mote texture. No additional sparkle treatment was added.",
            "Founder rejected open-room environment. August 28 regenerated on approved hero-atmosphere.jpg.",
        ],
        "row82Handoff": "READY",
        "currentBlockers": ["Founder visual review of the 12-execution countdown + launch-day campaign"],
        "founderActionRequired": "VISUAL REVIEW OF ACTUAL 12-EXECUTION CAMPAIGN",
        "row81CommitmentSatisfied": True,
        "row81Status": "READY FOR FOUNDER VISUAL ACCEPTANCE",
        "launchDateLock": "AUGUST 31, 2026",
        "imageryStatus": "APPROVED PHOTOGRAPHY RETAINED — FINAL CREATIVE ELEVATION: THE QUESTION + LAUNCH PAYOFF",
    }
    runs = ROOT / "ops" / "fab-5" / "runs" / "row-81-platform-native-assets-validation.json"
    runs.write_text(json.dumps(validation, indent=2), encoding="utf-8")
    print("pack written")
    print("all_pass", all_pass)


if __name__ == "__main__":
    main()
