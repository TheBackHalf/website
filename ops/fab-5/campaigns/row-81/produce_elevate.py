"""Final creative elevation pass — fewer words, THE QUESTION, launch-day payoff."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from produce_row81 import (  # noqa: E402
    ASSET_DIR,
    CHAMPAGNE,
    CREAM,
    add_vignette,
    cover_crop,
    draw_tracked,
    finish,
    font,
    load_rgb,
    wordmark,
    write_video,
)

STROKE = (16, 10, 26, 255)
NIGHT = (12, 8, 20)


def veil_bottom(im: Image.Image, start: float = 0.52, strength: float = 0.72) -> Image.Image:
    w, h = im.size
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    a = np.clip((yy - start) / max(0.01, 1 - start), 0, 1) ** 0.9 * strength
    a = np.repeat(a, w, axis=1)
    overlay = np.zeros((h, w, 4), dtype=np.uint8)
    overlay[..., :3] = NIGHT
    overlay[..., 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    return Image.alpha_composite(im.convert("RGBA"), Image.fromarray(overlay, "RGBA")).convert("RGB")


def veil_top(im: Image.Image, end: float = 0.16, strength: float = 0.48) -> Image.Image:
    w, h = im.size
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    a = np.clip(1 - yy / end, 0, 1) ** 0.85 * strength
    a = np.repeat(a, w, axis=1)
    overlay = np.zeros((h, w, 4), dtype=np.uint8)
    overlay[..., :3] = NIGHT
    overlay[..., 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    return Image.alpha_composite(im.convert("RGBA"), Image.fromarray(overlay, "RGBA")).convert("RGB")


def veil_left(im: Image.Image, width: float = 0.58, strength: float = 0.70) -> Image.Image:
    w, h = im.size
    xx = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    a = np.clip(1 - xx / width, 0, 1) ** 0.8 * strength
    a = np.repeat(a, h, axis=0)
    overlay = np.zeros((h, w, 4), dtype=np.uint8)
    overlay[..., :3] = NIGHT
    overlay[..., 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    return Image.alpha_composite(im.convert("RGBA"), Image.fromarray(overlay, "RGBA")).convert("RGB")


def world_field(source: Image.Image, w: int, h: int, *, fx: float, fy: float, zoom: float) -> Image.Image:
    canvas = cover_crop(source, w, h, fx, fy, zoom)
    canvas = ImageEnhance.Brightness(canvas).enhance(0.18)
    canvas = ImageEnhance.Color(canvas).enhance(0.62)
    canvas = add_vignette(canvas, 0.55)
    return canvas


def hairline(draw: ImageDraw.ImageDraw, cx: int, y: int, width: int = 72) -> None:
    draw.rectangle((cx - width // 2, y, cx + width // 2, y + 2), fill=CHAMPAGNE)


def question_label(draw: ImageDraw.ImageDraw, w: int, y: int) -> None:
    f = font("sans_medium", 15)
    draw_tracked(draw, "THE QUESTION", f, w // 2, y, CHAMPAGNE, 0.46, align="center")


def paint(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    font_obj,
    cx: int,
    y: int,
    *,
    fill=CREAM,
    align: str = "center",
    gap: float = 1.06,
    stroke: int = 1,
) -> int:
    cursor = y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_obj, stroke_width=stroke)
        tw = bbox[2] - bbox[0]
        x = cx - tw / 2 if align == "center" else (cx if align == "left" else cx - tw)
        draw.text((x, cursor), line, font=font_obj, fill=fill, stroke_width=stroke, stroke_fill=STROKE)
        cursor += int(font_obj.size * gap)
    return cursor


def photo_statement(
    source: Image.Image,
    w: int,
    h: int,
    lines: list[str],
    *,
    fx: float,
    fy: float,
    zoom: float,
    size: int = 72,
    italic: bool = True,
    question: bool = False,
    mark: bool = False,
    sub: str | None = None,
    silence: bool = False,
) -> Image.Image:
    canvas = cover_crop(source, w, h, fx, fy, zoom)
    canvas = ImageEnhance.Color(canvas).enhance(1.04)
    canvas = add_vignette(canvas, 0.26)
    if silence:
        return canvas
    canvas = veil_top(canvas, end=0.14 if mark else 0.08, strength=0.42 if mark else 0.18)
    canvas = veil_bottom(canvas, start=0.58 if h > 1000 else 0.42, strength=0.68)
    draw = ImageDraw.Draw(canvas)
    if mark:
        wordmark(draw, w, 52 if h > 1000 else 28, 18 if h < 800 else 20)
    display = font("display_medium_italic" if italic else "display_semibold", size)
    block = int(display.size * 1.06) * len(lines) + (48 if sub else 0)
    y = h - (210 if h > 1400 else 150 if h > 800 else 118) - block
    if question:
        question_label(draw, w, y - 46)
        hairline(draw, w // 2, y - 18, 56)
    end = paint(draw, lines, display, w // 2, y, gap=1.06, stroke=1)
    if sub:
        paint(draw, [sub], font("sans_medium", 24 if h > 800 else 20), w // 2, end + 18, fill=CHAMPAGNE, stroke=0)
    return canvas


def type_statement(
    source: Image.Image,
    w: int,
    h: int,
    lines: list[str],
    *,
    fx: float = 0.5,
    fy: float = 0.4,
    zoom: float = 1.35,
    size: int = 78,
    italic: bool = True,
    question: bool = False,
    mark: bool = True,
    sub: str | None = None,
) -> Image.Image:
    canvas = world_field(source, w, h, fx=fx, fy=fy, zoom=zoom)
    draw = ImageDraw.Draw(canvas)
    display = font("display_medium_italic" if italic else "display_semibold", size)
    block = int(display.size * 1.08) * len(lines)
    y = (h - block) // 2 - (20 if question else 0)
    if question:
        question_label(draw, w, y - 58)
        hairline(draw, w // 2, y - 28, 64)
    else:
        hairline(draw, w // 2, y - 28, 64)
    end = paint(draw, lines, display, w // 2, y, gap=1.08, stroke=0)
    if sub:
        paint(draw, [sub], font("sans_medium", 24 if h > 800 else 20), w // 2, end + 22, fill=CHAMPAGNE, stroke=0)
    if mark:
        wordmark(draw, w, h - (88 if h > 1400 else 56 if h > 800 else 36), 16 if h < 800 else 18)
    return canvas


def li_statement(
    source: Image.Image,
    lines: list[str],
    *,
    fx: float,
    fy: float,
    zoom: float,
    size: int = 48,
    italic: bool = True,
    question: bool = False,
    sub: str | None = None,
) -> Image.Image:
    canvas = cover_crop(source, 1200, 627, fx, fy, zoom)
    canvas = add_vignette(canvas, 0.22)
    canvas = veil_left(canvas, width=0.62, strength=0.78)
    draw = ImageDraw.Draw(canvas)
    if question:
        f = font("sans_medium", 13)
        draw_tracked(draw, "THE QUESTION", f, 64, 168, CHAMPAGNE, 0.42, align="left")
        draw.rectangle((64, 198, 128, 200), fill=CHAMPAGNE)
        y = 220
    else:
        wordmark(draw, 1200, 148, 18, align="left")
        y = 220
    display = font("display_medium_italic" if italic else "display_semibold", size)
    end = paint(draw, lines, display, 64, y, align="left", gap=1.08, stroke=1)
    if sub:
        paint(draw, [sub], font("sans_medium", 22), 64, end + 16, fill=CHAMPAGNE, align="left", stroke=0)
    return canvas


def lumina_presence(lumina: Image.Image, w: int, h: int, line: str | None = None) -> Image.Image:
    portrait = lumina.crop((160, 24, 860, 980))
    field = cover_crop(load_rgb("hero-atmosphere.jpg"), w, h, 0.52, 0.34, 1.22)
    field = ImageEnhance.Brightness(field).enhance(0.40)
    field = add_vignette(field, 0.48)
    target_h = int(h * 0.72)
    scale = target_h / portrait.height
    pw, ph = int(portrait.width * scale), target_h
    portrait = portrait.resize((pw, ph), Image.Resampling.LANCZOS)
    px = (w - pw) // 2
    py = 28 if h < 1600 else 80
    mask = Image.new("L", (pw, ph), 255)
    md = ImageDraw.Draw(mask)
    md.rectangle((0, ph - 160, pw, ph), fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(42))
    field.paste(portrait, (px, py), mask)
    field = veil_bottom(field, start=0.72, strength=0.55)
    draw = ImageDraw.Draw(field)
    if line:
        display = font("display_italic", 42 if h > 1400 else 36)
        paint(draw, [line], display, w // 2, h - (160 if h > 1400 else 120), stroke=1)
    return field


def produce() -> dict:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    hero = load_rgb("hero-atmosphere.jpg")
    journey = load_rgb("journey-light.jpg")
    lumina = load_rgb("Lumina Avatar.png")
    files: dict[str, list[str]] = {}

    ig28 = [
        photo_statement(
            hero, 1080, 1350, ["What if this isn't", "all there is?"],
            fx=0.44, fy=0.28, zoom=1.28, size=78, question=True,
        ),
        type_statement(hero, 1080, 1350, ["You did everything", "you were supposed to do."], size=70),
        photo_statement(hero, 1080, 1350, ["Now what?"], fx=0.30, fy=0.48, zoom=1.42, size=96, italic=True),
        type_statement(hero, 1080, 1350, ["August 31."], size=92, italic=False, sub="Something different is coming."),
    ]
    paths = [ASSET_DIR / f"R78-0828-IG-S0{i}.png" for i in range(1, 5)]
    for im, p in zip(ig28, paths):
        finish(im, p)
    files["R78-0828-IG"] = [str(p) for p in paths]

    finish(
        li_statement(
            hero, ["What if this isn't", "all there is?"],
            fx=0.28, fy=0.40, zoom=1.18, size=52, question=True,
        ),
        ASSET_DIR / "R78-0828-LI.png",
    )
    files["R78-0828-LI"] = [str(ASSET_DIR / "R78-0828-LI.png")]

    tt28 = [
        (photo_statement(hero, 1080, 1920, [], fx=0.42, fy=0.30, zoom=1.32, silence=True), 2.5),
        (
            photo_statement(
                hero, 1080, 1920, ["What if this isn't", "all there is?"],
                fx=0.42, fy=0.30, zoom=1.32, size=74, question=True,
            ),
            4.6,
        ),
        (type_statement(hero, 1080, 1920, ["You did everything", "you were supposed to do."], size=68), 4.2),
        (photo_statement(hero, 1080, 1920, ["Now what?"], fx=0.32, fy=0.46, zoom=1.38, size=92), 3.8),
        (type_statement(hero, 1080, 1920, ["August 31."], size=86, italic=False), 5.0),
    ]
    write_video(tt28, ASSET_DIR / "R78-0828-TT.mp4", ASSET_DIR / "R78-0828-TT-cover.png")
    finish(tt28[1][0], ASSET_DIR / "R78-0828-TT-cover.png")
    files["R78-0828-TT"] = [str(ASSET_DIR / "R78-0828-TT.mp4"), str(ASSET_DIR / "R78-0828-TT-cover.png")]

    ig29 = [
        photo_statement(
            journey, 1080, 1350, ["When was the last time", "you felt completely alive?"],
            fx=0.58, fy=0.38, zoom=1.16, size=64, question=True,
        ),
        type_statement(journey, 1080, 1350, ["Magical is Possible."], size=78, italic=False),
        photo_statement(
            journey, 1080, 1350, ["What are you saving", "for someday?"],
            fx=0.42, fy=0.55, zoom=1.24, size=72, question=True,
        ),
        type_statement(journey, 1080, 1350, ["There is a path."], size=86, italic=True),
    ]
    paths = [ASSET_DIR / f"R78-0829-IG-S0{i}.png" for i in range(1, 5)]
    for im, p in zip(ig29, paths):
        finish(im, p)
    files["R78-0829-IG"] = [str(p) for p in paths]

    finish(
        li_statement(
            journey, ["When was the last time", "you felt completely alive?"],
            fx=0.55, fy=0.42, zoom=1.20, size=42, question=True,
        ),
        ASSET_DIR / "R78-0829-LI.png",
    )
    files["R78-0829-LI"] = [str(ASSET_DIR / "R78-0829-LI.png")]

    tt29 = [
        (photo_statement(journey, 1080, 1920, [], fx=0.56, fy=0.40, zoom=1.18, silence=True), 2.5),
        (
            photo_statement(
                journey, 1080, 1920, ["When was the last time", "you felt completely alive?"],
                fx=0.56, fy=0.40, zoom=1.18, size=62, question=True,
            ),
            5.0,
        ),
        (type_statement(journey, 1080, 1920, ["Magical is Possible."], size=74, italic=False), 3.8),
        (
            photo_statement(
                journey, 1080, 1920, ["What are you saving", "for someday?"],
                fx=0.44, fy=0.52, zoom=1.22, size=68, question=True,
            ),
            4.6,
        ),
        (type_statement(journey, 1080, 1920, ["There is a path."], size=80), 4.4),
    ]
    write_video(tt29, ASSET_DIR / "R78-0829-TT.mp4", ASSET_DIR / "R78-0829-TT-cover.png")
    finish(tt29[1][0], ASSET_DIR / "R78-0829-TT-cover.png")
    files["R78-0829-TT"] = [str(ASSET_DIR / "R78-0829-TT.mp4"), str(ASSET_DIR / "R78-0829-TT-cover.png")]

    ig30 = [
        type_statement(
            hero, 1080, 1350, ["What if someday", "is August 31?"],
            size=76, question=True, mark=True,
        ),
        lumina_presence(lumina, 1080, 1350),
        type_statement(hero, 1080, 1350, ["Tomorrow."], size=96, italic=False),
    ]
    paths = [ASSET_DIR / f"R78-0830-IG-S0{i}.png" for i in range(1, 4)]
    for im, p in zip(ig30, paths):
        finish(im, p)
    files["R78-0830-IG"] = [str(p) for p in paths]

    finish(
        li_statement(
            hero, ["What if someday", "is August 31?"],
            fx=0.46, fy=0.38, zoom=1.12, size=52, question=True,
        ),
        ASSET_DIR / "R78-0830-LI.png",
    )
    files["R78-0830-LI"] = [str(ASSET_DIR / "R78-0830-LI.png")]

    tt30 = [
        (photo_statement(hero, 1080, 1920, [], fx=0.48, fy=0.32, zoom=1.20, silence=True), 2.6),
        (
            type_statement(
                hero, 1080, 1920, ["What if someday", "is August 31?"],
                size=72, question=True,
            ),
            5.4,
        ),
        (lumina_presence(lumina, 1080, 1920), 5.2),
        (type_statement(hero, 1080, 1920, ["Tomorrow."], size=92, italic=False), 6.0),
    ]
    write_video(tt30, ASSET_DIR / "R78-0830-TT.mp4", ASSET_DIR / "R78-0830-TT-cover.png")
    finish(tt30[1][0], ASSET_DIR / "R78-0830-TT-cover.png")
    files["R78-0830-TT"] = [str(ASSET_DIR / "R78-0830-TT.mp4"), str(ASSET_DIR / "R78-0830-TT-cover.png")]

    ig31 = [
        photo_statement(
            hero, 1080, 1350, ["THE BACK HALF", "IS HERE."],
            fx=0.48, fy=0.24, zoom=1.12, size=78, italic=False, mark=True,
        ),
        type_statement(hero, 1080, 1350, ["You spent years becoming", "who you were supposed to be."], size=64),
        photo_statement(hero, 1080, 1350, ["Now comes", "a different question."], fx=0.32, fy=0.42, zoom=1.20, size=72),
        type_statement(journey, 1080, 1350, ["Who do you choose", "to become next?"], size=72, question=True),
        photo_statement(
            journey, 1080, 1350, ["FROM EXPECTATION", "TO INTENTION."],
            fx=0.54, fy=0.40, zoom=1.16, size=62, italic=False,
        ),
        type_statement(journey, 1080, 1350, ["There is more life", "inside your life."], size=70),
        photo_statement(
            journey, 1080, 1350, ["MAGICAL", "IS POSSIBLE."],
            fx=0.50, fy=0.30, zoom=1.22, size=78, italic=False,
        ),
        type_statement(
            journey, 1080, 1350, ["BECOME AN ARCHITECT."],
            size=62, italic=False, sub="thebackhalf.org/register",
        ),
    ]
    paths = [ASSET_DIR / f"R81-0831-IG-S0{i}.png" for i in range(1, 9)]
    for im, p in zip(ig31, paths):
        finish(im, p)
    files["R81-0831-IG"] = [str(p) for p in paths]

    finish(
        li_statement(
            journey, ["THE BACK HALF", "IS HERE."],
            fx=0.52, fy=0.38, zoom=1.14, size=54, italic=False, sub="The doors are open.  ·  August 31, 2026",
        ),
        ASSET_DIR / "R81-0831-LI.png",
    )
    files["R81-0831-LI"] = [str(ASSET_DIR / "R81-0831-LI.png")]

    tt31 = [
        (photo_statement(hero, 1080, 1920, [], fx=0.48, fy=0.24, zoom=1.14, silence=True), 2.2),
        (
            photo_statement(
                hero, 1080, 1920, ["THE BACK HALF", "IS HERE."],
                fx=0.48, fy=0.24, zoom=1.14, size=72, italic=False, mark=True,
            ),
            3.6,
        ),
        (type_statement(hero, 1080, 1920, ["You spent years becoming", "who you were supposed to be."], size=60), 4.0),
        (type_statement(journey, 1080, 1920, ["Who do you choose", "to become next?"], size=68, question=True), 3.8),
        (
            photo_statement(
                journey, 1080, 1920, ["FROM EXPECTATION", "TO INTENTION."],
                fx=0.54, fy=0.40, zoom=1.16, size=58, italic=False,
            ),
            3.6,
        ),
        (
            photo_statement(
                journey, 1080, 1920, ["MAGICAL", "IS POSSIBLE."],
                fx=0.50, fy=0.30, zoom=1.20, size=74, italic=False,
            ),
            3.4,
        ),
        (
            type_statement(
                journey, 1080, 1920, ["BECOME AN ARCHITECT."],
                size=58, italic=False, sub="thebackhalf.org/register",
            ),
            4.8,
        ),
    ]
    write_video(tt31, ASSET_DIR / "R81-0831-TT.mp4", ASSET_DIR / "R81-0831-TT-cover.png")
    finish(tt31[1][0], ASSET_DIR / "R81-0831-TT-cover.png")
    files["R81-0831-TT"] = [str(ASSET_DIR / "R81-0831-TT.mp4"), str(ASSET_DIR / "R81-0831-TT-cover.png")]

    return {"files": {k: [Path(x).name for x in v] for k, v in files.items()}}


if __name__ == "__main__":
    print(json.dumps(produce(), indent=2))
