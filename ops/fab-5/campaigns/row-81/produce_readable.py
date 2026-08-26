"""Rebuild type presentation on approved imagery; add August 31 launch-day executions."""

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
    finish,
    font,
    load_rgb,
    wordmark,
    wrap_text,
    write_video,
)

STROKE = (18, 12, 30, 255)
PANEL = (12, 8, 20)


def type_panel(im: Image.Image, box: tuple[int, int, int, int], *, radius: int = 28, alpha: int = 168) -> Image.Image:
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle(box, radius=radius, fill=(*PANEL, alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(22))
    return Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")


def lower_veil(im: Image.Image, start: float = 0.38, strength: float = 0.90) -> Image.Image:
    w, h = im.size
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    a = np.clip((yy - start) / max(0.01, 1 - start), 0, 1) ** 0.85
    a = a * strength
    a = np.repeat(a, w, axis=1)
    overlay = np.zeros((h, w, 4), dtype=np.uint8)
    overlay[..., 0] = PANEL[0]
    overlay[..., 1] = PANEL[1]
    overlay[..., 2] = PANEL[2]
    overlay[..., 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    return Image.alpha_composite(im.convert("RGBA"), Image.fromarray(overlay, "RGBA")).convert("RGB")


def top_veil(im: Image.Image, end: float = 0.20, strength: float = 0.58) -> Image.Image:
    w, h = im.size
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    a = np.clip(1 - yy / end, 0, 1) ** 0.85 * strength
    a = np.repeat(a, w, axis=1)
    overlay = np.zeros((h, w, 4), dtype=np.uint8)
    overlay[..., 0] = PANEL[0]
    overlay[..., 1] = PANEL[1]
    overlay[..., 2] = PANEL[2]
    overlay[..., 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    return Image.alpha_composite(im.convert("RGBA"), Image.fromarray(overlay, "RGBA")).convert("RGB")


def left_veil(im: Image.Image, width: float = 0.62, strength: float = 0.72) -> Image.Image:
    w, h = im.size
    xx = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    a = np.clip(1 - xx / width, 0, 1) ** 0.75 * strength
    a = np.repeat(a, h, axis=0)
    overlay = np.zeros((h, w, 4), dtype=np.uint8)
    overlay[..., 0] = PANEL[0]
    overlay[..., 1] = PANEL[1]
    overlay[..., 2] = PANEL[2]
    overlay[..., 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    return Image.alpha_composite(im.convert("RGBA"), Image.fromarray(overlay, "RGBA")).convert("RGB")


def draw_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    font_obj,
    cx: int,
    y: int,
    *,
    fill=CREAM,
    align: str = "center",
    gap: float = 1.08,
    stroke: int = 2,
) -> int:
    cursor = y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_obj, stroke_width=stroke)
        tw = bbox[2] - bbox[0]
        x = cx - tw / 2 if align == "center" else (cx if align == "left" else cx - tw)
        draw.text(
            (x, cursor),
            line,
            font=font_obj,
            fill=fill,
            stroke_width=stroke,
            stroke_fill=STROKE,
        )
        cursor += int(font_obj.size * gap)
    return cursor


def split_headline(text: str, font_obj, max_width: int) -> list[str]:
    return wrap_text(text, font_obj, max_width)


def compose_ig(
    source: Image.Image,
    headline: str,
    *,
    fx: float,
    fy: float,
    zoom: float,
    italic: bool = True,
    sub: str | None = None,
    size: int = 92,
) -> Image.Image:
    canvas = cover_crop(source, 1080, 1350, fx, fy, zoom)
    canvas = ImageEnhance.Color(canvas).enhance(1.02)
    canvas = add_vignette(canvas, 0.28)
    canvas = top_veil(canvas, end=0.22, strength=0.62)
    canvas = lower_veil(canvas, start=0.36, strength=0.92)
    display = font("display_medium_italic" if italic else "display_semibold", size)
    lines = split_headline(headline, display, 880)
    if len(lines) >= 3:
        display = font("display_medium_italic" if italic else "display_semibold", 76)
        lines = split_headline(headline, display, 880)
    line_h = int(display.size * 1.08)
    block_h = line_h * len(lines) + (70 if sub else 36)
    y = 1350 - 110 - block_h
    canvas = type_panel(canvas, (56, y - 36, 1024, 1350 - 48), alpha=176)
    draw = ImageDraw.Draw(canvas)
    wordmark(draw, 1080, 56, 24)
    end = draw_lines(draw, lines, display, 540, y, gap=1.08, stroke=2)
    if sub:
        sub_f = font("sans_medium", 28)
        draw_lines(draw, [sub], sub_f, 540, end + 16, fill=CHAMPAGNE, stroke=1)
    return canvas


def compose_li(
    source: Image.Image,
    lines: list[str],
    *,
    fx: float,
    fy: float,
    zoom: float,
    italic: bool = True,
    size: int = 58,
    sub: str | None = None,
) -> Image.Image:
    canvas = cover_crop(source, 1200, 627, fx, fy, zoom)
    canvas = add_vignette(canvas, 0.24)
    canvas = left_veil(canvas, width=0.78, strength=0.86)
    canvas = type_panel(canvas, (36, 118, 760, 575), radius=22, alpha=172)
    draw = ImageDraw.Draw(canvas)
    wordmark(draw, 1200, 148, 22, align="left")
    display = font("display_medium_italic" if italic else "display_semibold", size)
    end = draw_lines(draw, lines, display, 64, 232, align="left", gap=1.08, stroke=2)
    if sub:
        sub_f = font("sans_medium", 26)
        draw_lines(draw, [sub], sub_f, 64, end + 18, fill=CHAMPAGNE, align="left", stroke=1)
    return canvas


def compose_tt(
    source: Image.Image,
    lines: list[str],
    *,
    fx: float,
    fy: float,
    zoom: float,
    size: int = 78,
    italic: bool = True,
    sub: str | None = None,
) -> Image.Image:
    canvas = cover_crop(source, 1080, 1920, fx, fy, zoom)
    canvas = add_vignette(canvas, 0.28)
    canvas = top_veil(canvas, end=0.18, strength=0.64)
    canvas = lower_veil(canvas, start=0.42, strength=0.93)
    display = font("display_medium_italic" if italic else "display_semibold", size)
    line_h = int(display.size * 1.10)
    block_h = line_h * len(lines) + (78 if sub else 40)
    y = 1920 - 220 - block_h
    canvas = type_panel(canvas, (48, y - 40, 1032, 1920 - 150), radius=30, alpha=180)
    draw = ImageDraw.Draw(canvas)
    wordmark(draw, 1080, 150, 24)
    end = draw_lines(draw, lines, display, 540, y, gap=1.10, stroke=2)
    if sub:
        sub_f = font("sans_medium", 30)
        draw_lines(draw, [sub], sub_f, 540, end + 18, fill=CHAMPAGNE, stroke=1)
    return canvas


def compose_lumina_readable(lumina: Image.Image, lines: list[str], sub: str | None) -> Image.Image:
    portrait = lumina.crop((160, 30, 864, 980))
    field = cover_crop(load_rgb("hero-atmosphere.jpg"), 1080, 1350, 0.55, 0.38, 1.2)
    field = ImageEnhance.Brightness(field).enhance(0.46)
    field = add_vignette(field, 0.45)
    field = top_veil(field, end=0.18, strength=0.55)
    target_h = 860
    scale = target_h / portrait.height
    pw, ph = int(portrait.width * scale), target_h
    portrait = portrait.resize((pw, ph), Image.Resampling.LANCZOS)
    px = (1080 - pw) // 2
    mask = Image.new("L", (pw, ph), 255)
    md = ImageDraw.Draw(mask)
    md.rectangle((0, ph - 150, pw, ph), fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(40))
    field.paste(portrait, (px, 20), mask)
    field = lower_veil(field, start=0.50, strength=0.94)
    field = type_panel(field, (56, 900, 1024, 1302), alpha=182)
    draw = ImageDraw.Draw(field)
    wordmark(draw, 1080, 48, 22)
    display = font("display_semibold", 88)
    end = draw_lines(draw, lines, display, 540, 960, gap=1.05, stroke=2)
    if sub:
        sub_f = font("sans_medium", 28)
        draw_lines(draw, [sub], sub_f, 540, end + 16, fill=CHAMPAGNE, stroke=1)
    return field


def compose_lumina_tt(lumina: Image.Image, lines: list[str], sub: str | None = None) -> Image.Image:
    portrait = lumina.crop((150, 20, 874, 1040))
    field = cover_crop(load_rgb("hero-atmosphere.jpg"), 1080, 1920, 0.5, 0.35, 1.18)
    field = ImageEnhance.Brightness(field).enhance(0.42)
    field = add_vignette(field, 0.45)
    field = top_veil(field, end=0.18, strength=0.60)
    target_h = 1100
    scale = target_h / portrait.height
    pw, ph = int(portrait.width * scale), target_h
    portrait = portrait.resize((pw, ph), Image.Resampling.LANCZOS)
    px = (1080 - pw) // 2
    mask = Image.new("L", (pw, ph), 255)
    md = ImageDraw.Draw(mask)
    md.rectangle((0, ph - 180, pw, ph), fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(48))
    field.paste(portrait, (px, 80), mask)
    field = lower_veil(field, start=0.48, strength=0.94)
    field = type_panel(field, (48, 1160, 1032, 1770), radius=30, alpha=182)
    draw = ImageDraw.Draw(field)
    wordmark(draw, 1080, 150, 24)
    display = font("display_semibold", 78)
    end = draw_lines(draw, lines, display, 540, 1240, gap=1.08, stroke=2)
    if sub:
        sub_f = font("sans_medium", 30)
        draw_lines(draw, [sub], sub_f, 540, end + 16, fill=CHAMPAGNE, stroke=1)
    return field


def produce() -> dict:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    hero = load_rgb("hero-atmosphere.jpg")
    journey = load_rgb("journey-light.jpg")
    lumina = load_rgb("Lumina Avatar.png")
    files: dict[str, list[str]] = {}

    ig28 = [
        compose_ig(hero, "Is this all there is?", fx=0.42, fy=0.52, zoom=1.22, size=96),
        compose_ig(hero, "A good life can still want more.", fx=0.28, fy=0.38, zoom=1.12, size=86),
        compose_ig(hero, "There is a name for that quiet pull.", fx=0.62, fy=0.34, zoom=1.18, size=86),
        compose_ig(
            hero,
            "Something different is coming.",
            fx=0.48,
            fy=0.22,
            zoom=1.08,
            size=86,
            sub="August 31, 2026",
        ),
    ]
    paths = [ASSET_DIR / f"R78-0828-IG-S0{i}.png" for i in range(1, 5)]
    for im, p in zip(ig28, paths):
        finish(im, p)
    files["R78-0828-IG"] = [str(p) for p in paths]

    finish(
        compose_li(
            hero,
            ["A good life", "can still want more."],
            fx=0.30,
            fy=0.42,
            zoom=1.14,
            size=62,
        ),
        ASSET_DIR / "R78-0828-LI.png",
    )
    files["R78-0828-LI"] = [str(ASSET_DIR / "R78-0828-LI.png")]

    tt28 = [
        (compose_tt(hero, ["You can have a good life", "and still feel it."], fx=0.42, fy=0.40, zoom=1.16), 5.0),
        (compose_tt(hero, ["Is this all there is?"], fx=0.30, fy=0.32, zoom=1.22, size=88), 4.6),
        (compose_tt(hero, ["Aliveness is asking", "to be felt again."], fx=0.48, fy=0.50, zoom=1.08), 5.2),
        (
            compose_tt(
                hero,
                ["Something different", "is coming."],
                fx=0.34,
                fy=0.28,
                zoom=1.06,
                italic=False,
                size=84,
                sub="August 31, 2026",
            ),
            5.8,
        ),
    ]
    write_video(tt28, ASSET_DIR / "R78-0828-TT.mp4", ASSET_DIR / "R78-0828-TT-cover.png")
    files["R78-0828-TT"] = [str(ASSET_DIR / "R78-0828-TT.mp4"), str(ASSET_DIR / "R78-0828-TT-cover.png")]

    ig29 = [
        compose_ig(journey, "Magical is Possible.", fx=0.58, fy=0.42, zoom=1.08, italic=False, size=92),
        compose_ig(journey, "Aliveness. Wonder. Meaning.", fx=0.42, fy=0.55, zoom=1.16, size=84),
        compose_ig(journey, "Your future does not have to repeat your past.", fx=0.62, fy=0.38, zoom=1.12, size=78),
        compose_ig(journey, "Become an Architect.", fx=0.50, fy=0.30, zoom=1.20, italic=False, size=90),
    ]
    paths = [ASSET_DIR / f"R78-0829-IG-S0{i}.png" for i in range(1, 5)]
    for im, p in zip(ig29, paths):
        finish(im, p)
    files["R78-0829-IG"] = [str(p) for p in paths]

    finish(
        compose_li(
            journey,
            ["Magical is Possible."],
            fx=0.55,
            fy=0.45,
            zoom=1.22,
            italic=False,
            size=64,
        ),
        ASSET_DIR / "R78-0829-LI.png",
    )
    files["R78-0829-LI"] = [str(ASSET_DIR / "R78-0829-LI.png")]

    tt29 = [
        (compose_tt(journey, ["Magical is Possible."], fx=0.55, fy=0.48, zoom=1.08, italic=False, size=86), 5.0),
        (compose_tt(journey, ["in your real life."], fx=0.42, fy=0.58, zoom=1.16, size=84), 4.6),
        (compose_tt(journey, ["Aliveness. Wonder.", "Meaning. Adventure."], fx=0.62, fy=0.36, zoom=1.14), 5.2),
        (
            compose_tt(
                journey,
                ["Become an Architect."],
                fx=0.48,
                fy=0.28,
                zoom=1.22,
                italic=False,
                size=84,
                sub="Magical is Possible.",
            ),
            5.8,
        ),
    ]
    write_video(tt29, ASSET_DIR / "R78-0829-TT.mp4", ASSET_DIR / "R78-0829-TT-cover.png")
    files["R78-0829-TT"] = [str(ASSET_DIR / "R78-0829-TT.mp4"), str(ASSET_DIR / "R78-0829-TT-cover.png")]

    finish(
        compose_lumina_readable(
            lumina,
            ["Meet Lumina."],
            "Your AI Guide  ·  Tomorrow, August 31, 2026",
        ),
        ASSET_DIR / "R78-0830-IG.png",
    )
    files["R78-0830-IG"] = [str(ASSET_DIR / "R78-0830-IG.png")]

    finish(
        compose_li(
            hero,
            ["Tomorrow.", "August 31, 2026."],
            fx=0.46,
            fy=0.42,
            zoom=1.08,
            italic=False,
            size=68,
            sub="The Back Half opens.",
        ),
        ASSET_DIR / "R78-0830-LI.png",
    )
    files["R78-0830-LI"] = [str(ASSET_DIR / "R78-0830-LI.png")]

    tt30 = [
        (compose_lumina_tt(lumina, ["Tomorrow,", "The Back Half opens."]), 5.0),
        (compose_lumina_tt(lumina, ["Meet Lumina."], "Your AI Guide"), 4.8),
        (compose_lumina_tt(lumina, ["Tomorrow,", "you can begin."]), 5.0),
        (
            compose_tt(
                hero,
                ["August 31, 2026."],
                fx=0.48,
                fy=0.40,
                zoom=1.15,
                italic=False,
                size=86,
                sub="The beginning.",
            ),
            5.8,
        ),
    ]
    write_video(tt30, ASSET_DIR / "R78-0830-TT.mp4", ASSET_DIR / "R78-0830-TT-cover.png")
    files["R78-0830-TT"] = [str(ASSET_DIR / "R78-0830-TT.mp4"), str(ASSET_DIR / "R78-0830-TT-cover.png")]

    # Launch day — same approved imagery, unmistakable "it is here"
    ig31 = [
        compose_ig(hero, "The Back Half is here.", fx=0.48, fy=0.28, zoom=1.10, italic=False, size=92),
        compose_ig(
            hero,
            "What would your life look like if you lived it intentionally?",
            fx=0.32,
            fy=0.40,
            zoom=1.14,
            size=78,
        ),
        compose_ig(journey, "From expectation to intention.", fx=0.55, fy=0.42, zoom=1.12, italic=False, size=84),
        compose_ig(
            journey,
            "Become an Architect.",
            fx=0.50,
            fy=0.30,
            zoom=1.18,
            italic=False,
            size=90,
            sub="thebackhalf.org/register",
        ),
    ]
    paths = [ASSET_DIR / f"R81-0831-IG-S0{i}.png" for i in range(1, 5)]
    for im, p in zip(ig31, paths):
        finish(im, p)
    files["R81-0831-IG"] = [str(p) for p in paths]

    finish(
        compose_li(
            journey,
            ["The Back Half is here."],
            fx=0.52,
            fy=0.40,
            zoom=1.16,
            italic=False,
            size=58,
            sub="Become an Architect.  ·  August 31, 2026",
        ),
        ASSET_DIR / "R81-0831-LI.png",
    )
    files["R81-0831-LI"] = [str(ASSET_DIR / "R81-0831-LI.png")]

    tt31 = [
        (compose_tt(hero, ["THE BACK HALF", "IS HERE."], fx=0.48, fy=0.28, zoom=1.10, italic=False, size=78), 4.4),
        (
            compose_tt(
                hero,
                ["What would your life look like", "if you lived it intentionally?"],
                fx=0.32,
                fy=0.38,
                zoom=1.12,
                size=62,
            ),
            5.2,
        ),
        (compose_tt(journey, ["From expectation", "to intention."], fx=0.55, fy=0.42, zoom=1.12, italic=False, size=76), 4.4),
        (compose_tt(journey, ["Magical is Possible."], fx=0.50, fy=0.32, zoom=1.18, italic=False, size=82), 4.0),
        (
            compose_tt(
                journey,
                ["BECOME AN ARCHITECT"],
                fx=0.48,
                fy=0.28,
                zoom=1.20,
                italic=False,
                size=62,
                sub="thebackhalf.org/register",
            ),
            5.4,
        ),
    ]
    write_video(tt31, ASSET_DIR / "R81-0831-TT.mp4", ASSET_DIR / "R81-0831-TT-cover.png")
    files["R81-0831-TT"] = [str(ASSET_DIR / "R81-0831-TT.mp4"), str(ASSET_DIR / "R81-0831-TT-cover.png")]

    return {"files": {k: [Path(x).name for x in v] for k, v in files.items()}}


if __name__ == "__main__":
    print(json.dumps(produce(), indent=2))
