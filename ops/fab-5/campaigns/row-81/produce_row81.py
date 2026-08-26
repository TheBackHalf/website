"""Row 81 — produce August 28–30 platform-native social assets from approved Row 78 copy."""

from __future__ import annotations

import json
import math
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[4]
FONT_DIR = Path(__file__).resolve().parent / ".fonts"
ASSET_DIR = Path(__file__).resolve().parent / "assets"
PUBLIC_DIR = ROOT / "public" / "images"

CREAM = (247, 241, 230, 255)
CHAMPAGNE = (230, 211, 168, 255)
CHAMPAGNE_SOFT = (230, 211, 168, 210)
WHITE = (255, 253, 248, 255)
NIGHT = (28, 20, 40, 255)
DUSK = (42, 27, 61, 255)

FONTS = {
    "display": FONT_DIR / "CormorantGaramond-Regular.ttf",
    "display_italic": FONT_DIR / "CormorantGaramond-Italic.ttf",
    "display_medium_italic": FONT_DIR / "CormorantGaramond-MediumItalic.ttf",
    "display_semibold": FONT_DIR / "CormorantGaramond-Semibold.ttf",
    "sans_light": FONT_DIR / "Outfit-Light.ttf",
    "sans": FONT_DIR / "Outfit-Regular.ttf",
    "sans_medium": FONT_DIR / "Outfit-Medium.ttf",
}


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS[name]), size)


def load_rgb(name: str) -> Image.Image:
    return Image.open(PUBLIC_DIR / name).convert("RGB")


def cover_crop(
    im: Image.Image,
    w: int,
    h: int,
    fx: float = 0.5,
    fy: float = 0.5,
    zoom: float = 1.0,
) -> Image.Image:
    src_w, src_h = im.size
    scale = max(w / src_w, h / src_h) * zoom
    nw, nh = max(w, int(round(src_w * scale))), max(h, int(round(src_h * scale)))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    cx = int(round(fx * nw))
    cy = int(round(fy * nh))
    left = min(max(cx - w // 2, 0), nw - w)
    top = min(max(cy - h // 2, 0), nh - h)
    return resized.crop((left, top, left + w, top + h))


def add_vignette(im: Image.Image, strength: float = 0.42) -> Image.Image:
    w, h = im.size
    yy, xx = np.mgrid[0:h, 0:w]
    nx = (xx - w / 2) / (w / 2)
    ny = (yy - h / 2) / (h / 2)
    r = np.sqrt(nx * nx * 0.85 + ny * ny * 1.05)
    falloff = np.clip((r - 0.55) / 0.85, 0, 1) ** 1.35
    alpha = (falloff * strength * 255).astype(np.uint8)
    dark = np.zeros((h, w, 3), dtype=np.uint8)
    dark[:] = (18, 12, 28)
    base = np.asarray(im.convert("RGB")).astype(np.float32)
    a = (alpha.astype(np.float32) / 255.0)[..., None]
    out = base * (1 - a) + dark.astype(np.float32) * a
    return Image.fromarray(out.astype(np.uint8), "RGB")


def scrim(
    im: Image.Image,
    top: float = 0.18,
    bottom: float = 0.55,
    side: str = "bottom",
) -> Image.Image:
    w, h = im.size
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    xx = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    if side == "left":
        a = (0.22 + 0.28 * yy) * np.clip(1 - xx / 0.72, 0, 1) ** 1.05
        a = np.clip(a, 0, 1)
    else:
        a = np.zeros((h, 1), dtype=np.float32)
        top_zone = yy < 0.22
        bot_zone = yy > 0.42
        a = np.where(top_zone, top * (1 - yy / 0.22), a)
        a = np.where(bot_zone, bottom * ((yy - 0.42) / 0.58) ** 1.15, a)
        a = np.clip(a, 0, 1)
        a = np.repeat(a, w, axis=1)
    overlay = np.zeros((h, w, 4), dtype=np.uint8)
    overlay[..., 0] = 16
    overlay[..., 1] = 11
    overlay[..., 2] = 26
    overlay[..., 3] = (a * 255).astype(np.uint8)
    base = im.convert("RGBA")
    over = Image.fromarray(overlay, "RGBA")
    return Image.alpha_composite(base, over).convert("RGB")


def draw_tracked(
    draw: ImageDraw.ImageDraw,
    text: str,
    font_obj: ImageFont.FreeTypeFont,
    x: int,
    y: int,
    fill,
    tracking: float,
    align: str = "left",
) -> tuple[int, int]:
    size = font_obj.size
    gap = size * tracking
    widths = []
    for ch in text:
        bbox = draw.textbbox((0, 0), ch, font=font_obj)
        widths.append(bbox[2] - bbox[0])
    total = sum(widths) + gap * max(0, len(text) - 1)
    if align == "center":
        cx = x - total / 2
    elif align == "right":
        cx = x - total
    else:
        cx = x
    cursor = cx
    for ch, ww in zip(text, widths):
        draw.text((cursor, y), ch, font=font_obj, fill=fill)
        cursor += ww + gap
    bbox = font_obj.getbbox(text)
    return int(total), bbox[3] - bbox[1]


def wrap_text(text: str, font_obj: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    dummy = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    for word in words:
        trial = word if not current else current + " " + word
        bbox = dummy.textbbox((0, 0), trial, font=font_obj)
        if bbox[2] - bbox[0] <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_multiline(
    draw: ImageDraw.ImageDraw,
    text: str,
    font_obj: ImageFont.FreeTypeFont,
    cx: int,
    y: int,
    fill,
    max_width: int,
    line_gap: float = 1.12,
    align: str = "center",
) -> int:
    lines = wrap_text(text, font_obj, max_width)
    cursor = y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_obj)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        x = cx - w / 2 if align == "center" else (cx if align == "left" else cx - w)
        draw.text((x, cursor), line, font=font_obj, fill=fill)
        cursor += int(font_obj.size * line_gap)
    return cursor


def draw_rule(draw: ImageDraw.ImageDraw, cx: int, y: int, width: int, fill=CHAMPAGNE_SOFT) -> None:
    draw.rectangle((cx - width // 2, y, cx + width // 2, y + 2), fill=fill)


def wordmark(draw: ImageDraw.ImageDraw, w: int, y: int, size: int = 22, align: str = "center") -> None:
    f = font("sans_medium", size)
    x = w // 2 if align == "center" else (72 if align == "left" else w - 72)
    draw_tracked(draw, "THE BACK HALF", f, x, y, CHAMPAGNE, 0.34, align=align)


def finish(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = im.convert("RGB")
    rgb.save(path, "PNG", optimize=True)


def compose_ig_slide(
    source: Image.Image,
    headline: str,
    *,
    fx: float,
    fy: float,
    zoom: float,
    italic: bool = True,
    sub: str | None = None,
    footer: str | None = None,
    size: int = 78,
    darken: float = 0.48,
) -> Image.Image:
    canvas = cover_crop(source, 1080, 1350, fx, fy, zoom)
    canvas = ImageEnhance.Contrast(canvas).enhance(1.06)
    canvas = ImageEnhance.Color(canvas).enhance(0.96)
    canvas = add_vignette(canvas, 0.38)
    canvas = scrim(canvas, top=0.22, bottom=darken)
    draw = ImageDraw.Draw(canvas)
    wordmark(draw, 1080, 78, 20)
    display = font("display_medium_italic" if italic else "display_semibold", size)
    max_w = 860
    # Place headline in lower-middle for editorial stills.
    y = 560 if not sub else 500
    if len(headline) > 42:
        y = 520
        display = font("display_italic" if italic else "display", 64)
    end_y = draw_multiline(draw, headline, display, 540, y, CREAM, max_w, 1.08)
    draw_rule(draw, 540, end_y + 18, 88)
    if sub:
        sub_f = font("sans_light", 22)
        draw_multiline(draw, sub, sub_f, 540, end_y + 48, CHAMPAGNE, 720, 1.35)
    return canvas


def compose_li_wide(
    source: Image.Image,
    headline: str,
    *,
    fx: float,
    fy: float,
    zoom: float,
    size: int = 54,
    italic: bool = False,
    kicker: str | None = None,
) -> Image.Image:
    canvas = cover_crop(source, 1200, 627, fx, fy, zoom)
    canvas = ImageEnhance.Contrast(canvas).enhance(1.05)
    canvas = add_vignette(canvas, 0.34)
    canvas = scrim(canvas, top=0.16, bottom=0.42, side="left")
    draw = ImageDraw.Draw(canvas)
    wordmark(draw, 1200, 48, 18, align="left")
    x = 72
    y = 228
    display = font("display_italic" if italic else "display_semibold", size)
    draw_multiline(draw, headline, display, x, y, CREAM, 760, 1.08, align="left")
    return canvas


def compose_event_card(source: Image.Image) -> Image.Image:
    canvas = cover_crop(source, 1200, 627, 0.46, 0.42, 1.08)
    canvas = ImageEnhance.Color(canvas).enhance(1.05)
    canvas = add_vignette(canvas, 0.45)
    canvas = scrim(canvas, top=0.28, bottom=0.62)
    draw = ImageDraw.Draw(canvas)
    wordmark(draw, 1200, 52, 18)
    h1 = font("display_semibold", 86)
    draw_multiline(draw, "Tomorrow.", h1, 600, 228, CREAM, 1000, 1.0)
    h2 = font("display_italic", 72)
    draw_multiline(draw, "August 31.", h2, 600, 340, CREAM, 1000, 1.0)
    draw_rule(draw, 600, 450, 96)
    return canvas


def compose_lumina_ig(lumina: Image.Image) -> Image.Image:
    # Source file is a full branded scene with baked type. Crop to presence.
    portrait = lumina.crop((160, 30, 864, 980))
    field = Image.new("RGB", (1080, 1350), (24, 16, 36))
    hero = cover_crop(load_rgb("hero-atmosphere.jpg"), 1080, 1350, 0.55, 0.38, 1.2)
    hero = ImageEnhance.Brightness(hero).enhance(0.42)
    hero = add_vignette(hero, 0.55)
    field = hero
    # Place portrait in upper 62% with soft mask.
    target_h = 900
    scale = target_h / portrait.height
    pw = int(portrait.width * scale)
    ph = target_h
    portrait = portrait.resize((pw, ph), Image.Resampling.LANCZOS)
    px = (1080 - pw) // 2
    py = 40
    mask = Image.new("L", (pw, ph), 255)
    md = ImageDraw.Draw(mask)
    md.rectangle((0, ph - 160, pw, ph), fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(42))
    field.paste(portrait, (px, py), mask)
    field = scrim(field, top=0.12, bottom=0.72)
    draw = ImageDraw.Draw(field)
    wordmark(draw, 1080, 64, 18)
    h = font("display_semibold", 72)
    end = draw_multiline(draw, "Meet Lumina.", h, 540, 980, CREAM, 900, 1.05)
    sub = font("sans_light", 22)
    draw_multiline(draw, "Your AI Guide inside the Journey", sub, 540, end + 10, CHAMPAGNE, 820)
    ff = font("sans_medium", 18)
    draw_tracked(draw, "TOMORROW. AUGUST 31.", ff, 540, 1240, CHAMPAGNE, 0.26, align="center")
    return field


def compose_vertical_still(
    source: Image.Image,
    lines: list[str],
    *,
    fx: float,
    fy: float,
    zoom: float,
    end_card: bool = False,
) -> Image.Image:
    canvas = cover_crop(source, 1080, 1920, fx, fy, zoom)
    canvas = ImageEnhance.Contrast(canvas).enhance(1.05)
    canvas = add_vignette(canvas, 0.4)
    canvas = scrim(canvas, top=0.26, bottom=0.62)
    draw = ImageDraw.Draw(canvas)
    wordmark(draw, 1080, 160, 20)
    y = 780 if len(lines) <= 2 else 700
    if end_card:
        y = 820
        display = font("display_semibold", 72)
    else:
        display = font("display_medium_italic", 62)
    for i, line in enumerate(lines):
        f = display if i == 0 or end_card else font("display_italic", 54)
        y = draw_multiline(draw, line, f, 540, y, CREAM, 860, 1.12) + 18
    draw_rule(draw, 540, y + 8, 88)
    return canvas


def compose_lumina_vertical(lumina: Image.Image, lines: list[str], end_card: bool = False) -> Image.Image:
    if end_card:
        return compose_vertical_still(
            load_rgb("hero-atmosphere.jpg"),
            lines,
            fx=0.48,
            fy=0.4,
            zoom=1.15,
            end_card=True,
        )
    portrait = lumina.crop((150, 20, 874, 1040))
    field = cover_crop(load_rgb("hero-atmosphere.jpg"), 1080, 1920, 0.5, 0.35, 1.18)
    field = ImageEnhance.Brightness(field).enhance(0.38)
    field = add_vignette(field, 0.5)
    target_h = 1180
    scale = target_h / portrait.height
    pw, ph = int(portrait.width * scale), target_h
    portrait = portrait.resize((pw, ph), Image.Resampling.LANCZOS)
    px = (1080 - pw) // 2
    py = 120
    mask = Image.new("L", (pw, ph), 255)
    md = ImageDraw.Draw(mask)
    md.rectangle((0, ph - 180, pw, ph), fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(48))
    field.paste(portrait, (px, py), mask)
    field = scrim(field, top=0.18, bottom=0.68)
    draw = ImageDraw.Draw(field)
    wordmark(draw, 1080, 160, 20)
    y = 1320
    display = font("display_medium_italic", 54)
    for line in lines:
        y = draw_multiline(draw, line, display, 540, y, CREAM, 860, 1.12) + 10
    return field


def ffmpeg_exe() -> str:
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def write_video(frames: list[tuple[Image.Image, float]], dest: Path, cover: Path) -> float:
    """frames: list of (image, duration_seconds). Slow cross-dissolve between stills."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp_dir = dest.parent / "_frames"
    tmp_dir.mkdir(exist_ok=True)
    inputs = []
    for i, (im, dur) in enumerate(frames):
        p = tmp_dir / f"{dest.stem}_{i:02d}.png"
        finish(im, p)
        if i == 0:
            finish(im, cover)
        inputs.append((p, max(1.6, dur)))

    # Build filter: concat with xfade
    n = len(inputs)
    fade = 0.55
    args = [ffmpeg_exe(), "-y"]
    for p, dur in inputs:
        args += ["-loop", "1", "-t", f"{dur:.2f}", "-i", str(p)]
    # silent audio
    total = sum(d for _, d in inputs) - fade * (n - 1)
    filter_parts = []
    if n == 1:
        filter_complex = "[0:v]format=yuv420p[v]"
    else:
        last = "0:v"
        offset = inputs[0][1] - fade
        for i in range(1, n):
            out = f"v{i}"
            filter_parts.append(
                f"[{last}][{i}:v]xfade=transition=fade:duration={fade:.2f}:offset={offset:.2f}[{out}]"
            )
            last = out
            if i < n - 1:
                offset += inputs[i][1] - fade
        filter_complex = ";".join(filter_parts) + f";[{last}]format=yuv420p[v]"

    args += [
        "-f",
        "lavfi",
        "-t",
        f"{total:.2f}",
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-filter_complex",
        filter_complex,
        "-map",
        "[v]",
        "-map",
        f"{n}:a",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-profile:v",
        "high",
        "-crf",
        "18",
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        str(dest),
    ]
    subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return total


def probe_video(path: Path) -> dict:
    exe = ffmpeg_exe()
    ffprobe = str(Path(exe).with_name(Path(exe).name.replace("ffmpeg", "ffprobe")))
    cmd = [
        exe,
        "-i",
        str(path),
        "-hide_banner",
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    err = proc.stderr
    w = h = None
    duration = None
    for line in err.splitlines():
        if "Video:" in line and "x" in line:
            # Stream #0:0: Video: h264 ..., 1080x1920, ...
            for token in line.replace(",", " ").split():
                if "x" in token and token[0].isdigit():
                    a, b = token.split("x")[:2]
                    if a.isdigit() and b.isdigit():
                        w, h = int(a), int(b)
        if line.strip().startswith("Duration:"):
            t = line.split("Duration:")[1].split(",")[0].strip()
            hh, mm, ss = t.split(":")
            duration = int(hh) * 3600 + int(mm) * 60 + float(ss)
    return {"width": w, "height": h, "duration": duration, "stderr_ok": "Video:" in err}


def produce() -> dict:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    hero = load_rgb("hero-atmosphere.jpg")

    files: dict[str, list[str]] = {}

    # August 28 Instagram — approved hero-atmosphere (open-room source rejected).
    s01 = compose_ig_slide(
        hero,
        "Is this all there is?",
        fx=0.42,
        fy=0.52,
        zoom=1.22,
        italic=True,
        size=86,
        darken=0.54,
    )
    s02 = compose_ig_slide(
        hero,
        "A good life can still want more.",
        fx=0.28,
        fy=0.38,
        zoom=1.12,
        italic=True,
        size=64,
        darken=0.58,
    )
    s03 = compose_ig_slide(
        hero,
        "There is a name for what you’ve been feeling.",
        fx=0.62,
        fy=0.34,
        zoom=1.18,
        italic=True,
        size=68,
        darken=0.56,
    )
    s04 = compose_ig_slide(
        hero,
        "Something different is coming.",
        fx=0.48,
        fy=0.22,
        zoom=1.08,
        italic=True,
        size=72,
        sub="August 31.",
        darken=0.50,
    )
    ig28 = [
        ASSET_DIR / "R78-0828-IG-S01.png",
        ASSET_DIR / "R78-0828-IG-S02.png",
        ASSET_DIR / "R78-0828-IG-S03.png",
        ASSET_DIR / "R78-0828-IG-S04.png",
    ]
    for im, p in zip((s01, s02, s03, s04), ig28):
        finish(im, p)
    files["R78-0828-IG"] = [str(p.relative_to(ROOT)).replace("\\", "/") for p in ig28]

    li28 = ASSET_DIR / "R78-0828-LI.png"
    finish(
        compose_li_wide(
            hero,
            "A good life can still want more.",
            fx=0.30,
            fy=0.42,
            zoom=1.14,
            size=48,
            italic=True,
        ),
        li28,
    )
    files["R78-0828-LI"] = [str(li28.relative_to(ROOT)).replace("\\", "/")]

    tt28_frames = [
        (
            compose_vertical_still(
                hero,
                ["You can have a good life", "and still feel it."],
                fx=0.42,
                fy=0.40,
                zoom=1.16,
            ),
            3.4,
        ),
        (
            compose_vertical_still(
                hero,
                ["The quiet question.", "Is this all there is?"],
                fx=0.30,
                fy=0.32,
                zoom=1.22,
            ),
            3.6,
        ),
        (
            compose_vertical_still(
                hero,
                ["That question is not a crisis.", "It is aliveness, asking to be felt again."],
                fx=0.48,
                fy=0.50,
                zoom=1.08,
            ),
            5.0,
        ),
        (
            compose_vertical_still(
                hero,
                ["Achievement wasn’t the same thing as aliveness."],
                fx=0.55,
                fy=0.38,
                zoom=1.14,
            ),
            4.4,
        ),
        (
            compose_vertical_still(
                hero,
                ["There is a name for that feeling.", "Something different is coming."],
                fx=0.34,
                fy=0.28,
                zoom=1.06,
                end_card=True,
            ),
            5.2,
        ),
    ]
    tt28 = ASSET_DIR / "R78-0828-TT.mp4"
    tt28_cover = ASSET_DIR / "R78-0828-TT-cover.png"
    dur28 = write_video(tt28_frames, tt28, tt28_cover)
    files["R78-0828-TT"] = [
        str(tt28.relative_to(ROOT)).replace("\\", "/"),
        str(tt28_cover.relative_to(ROOT)).replace("\\", "/"),
    ]
    return {
        "files": files,
        "durations": {"R78-0828-TT": round(dur28, 2)},
        "correction": "aug28-open-room-removed",
    }


def _unused_aug29_start() -> None:
    # August 29
    p01 = compose_ig_slide(
        journey,
        "Magical is Possible.",
        fx=0.58,
        fy=0.42,
        zoom=1.08,
        italic=False,
        size=82,
        footer="August 29",
        darken=0.50,
    )
    p02 = compose_ig_slide(
        journey,
        "Aliveness. Wonder. Meaning. Adventure.",
        fx=0.42,
        fy=0.55,
        zoom=1.16,
        italic=True,
        size=60,
        footer="August 29",
        darken=0.55,
    )
    p03 = compose_ig_slide(
        journey,
        "Your future does not have to be an extension of your past.",
        fx=0.62,
        fy=0.38,
        zoom=1.12,
        italic=True,
        size=58,
        footer="August 29",
        darken=0.58,
    )
    p04 = compose_ig_slide(
        journey,
        "Become an Architect.",
        fx=0.50,
        fy=0.30,
        zoom=1.20,
        italic=False,
        size=76,
        footer="The Possibility",
        darken=0.52,
    )
    ig29 = [
        ASSET_DIR / "R78-0829-IG-S01.png",
        ASSET_DIR / "R78-0829-IG-S02.png",
        ASSET_DIR / "R78-0829-IG-S03.png",
        ASSET_DIR / "R78-0829-IG-S04.png",
    ]
    for im, p in zip((p01, p02, p03, p04), ig29):
        finish(im, p)
    files["R78-0829-IG"] = [str(p.relative_to(ROOT)).replace("\\", "/") for p in ig29]

    li29 = ASSET_DIR / "R78-0829-LI.png"
    finish(
        compose_li_wide(
            journey,
            "Magical is Possible.",
            fx=0.55,
            fy=0.45,
            zoom=1.22,
            size=68,
            italic=False,
            kicker="The Possibility",
        ),
        li29,
    )
    files["R78-0829-LI"] = [str(li29.relative_to(ROOT)).replace("\\", "/")]

    tt29_frames = [
        (
            compose_vertical_still(
                journey,
                ["What if Magical is Possible.", "is actually about your real life?"],
                fx=0.55,
                fy=0.48,
                zoom=1.08,
            ),
            4.0,
        ),
        (
            compose_vertical_still(
                journey,
                ["Not fantasy.", "Aliveness. Wonder. Meaning. Adventure."],
                fx=0.42,
                fy=0.58,
                zoom=1.16,
            ),
            4.2,
        ),
        (
            compose_vertical_still(
                journey,
                ["Your future does not have to be an extension of your past."],
                fx=0.62,
                fy=0.36,
                zoom=1.14,
            ),
            4.4,
        ),
        (
            compose_vertical_still(
                journey,
                ["Inspiration without a path is just atmosphere.", "The Back Half Journey is the path."],
                fx=0.50,
                fy=0.40,
                zoom=1.10,
            ),
            5.2,
        ),
        (
            compose_vertical_still(
                journey,
                ["Magical is Possible."],
                fx=0.48,
                fy=0.28,
                zoom=1.22,
                end_card=True,
            ),
            5.4,
        ),
    ]
    tt29 = ASSET_DIR / "R78-0829-TT.mp4"
    tt29_cover = ASSET_DIR / "R78-0829-TT-cover.png"
    dur29 = write_video(tt29_frames, tt29, tt29_cover)
    files["R78-0829-TT"] = [
        str(tt29.relative_to(ROOT)).replace("\\", "/"),
        str(tt29_cover.relative_to(ROOT)).replace("\\", "/"),
    ]

    # August 30
    ig30 = ASSET_DIR / "R78-0830-IG.png"
    finish(compose_lumina_ig(lumina), ig30)
    files["R78-0830-IG"] = [str(ig30.relative_to(ROOT)).replace("\\", "/")]

    li30 = ASSET_DIR / "R78-0830-LI.png"
    finish(compose_event_card(hero), li30)
    files["R78-0830-LI"] = [str(li30.relative_to(ROOT)).replace("\\", "/")]

    tt30_frames = [
        (
            compose_lumina_vertical(lumina, ["Tomorrow,", "The Back Half launches."]),
            3.4,
        ),
        (
            compose_lumina_vertical(
                lumina,
                ["If you’ve been feeling it —", "this is the door."],
            ),
            3.8,
        ),
        (
            compose_lumina_vertical(
                lumina,
                ["Lumina.", "Your AI Guide.", "Reflection. Questions. Insight."],
            ),
            4.6,
        ),
        (
            compose_lumina_vertical(
                lumina,
                ["The first Architects are about to begin.", "Tomorrow, you can become one of them."],
            ),
            4.6,
        ),
        (
            compose_lumina_vertical(lumina, ["Tomorrow.", "August 31."], end_card=True),
            5.2,
        ),
    ]
    tt30 = ASSET_DIR / "R78-0830-TT.mp4"
    tt30_cover = ASSET_DIR / "R78-0830-TT-cover.png"
    dur30 = write_video(tt30_frames, tt30, tt30_cover)
    files["R78-0830-TT"] = [
        str(tt30.relative_to(ROOT)).replace("\\", "/"),
        str(tt30_cover.relative_to(ROOT)).replace("\\", "/"),
    ]

    return {
        "files": files,
        "durations": {
            "R78-0828-TT": round(dur28, 2),
            "R78-0829-TT": round(dur29, 2),
            "R78-0830-TT": round(dur30, 2),
        },
    }


if __name__ == "__main__":
    result = produce()
    print(json.dumps(result, indent=2))
