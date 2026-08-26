"""Slice Founder-approved legal bases from extracted Foundry paragraphs."""
from __future__ import annotations

import json
import re
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / ".tmp-legal-v1"


def load(name: str) -> list[dict]:
    return json.loads((OUT / f"{name}-paragraphs.json").read_text(encoding="utf-8"))


def dump_slice(name: str, rows: list[dict], start: int, end: int, out_name: str) -> None:
    slice_rows = [r for r in rows if start <= r["i"] <= end]
    lines = []
    for r in slice_rows:
        prefix = "# " if r["heading"] else ""
        lines.append(f"{prefix}{r['text']}")
    (OUT / out_name).write_text("\n\n".join(lines) + "\n", encoding="utf-8")
    print(out_name, "paras", len(slice_rows), "chars", sum(len(r["text"]) for r in slice_rows))


def search(rows: list[dict], pattern: str, limit: int = 80) -> list[dict]:
    rx = re.compile(pattern, re.I)
    hits = []
    for r in rows:
        if rx.search(r["text"]):
            hits.append({"i": r["i"], "heading": r["heading"], "text": r["text"][:500]})
            if len(hits) >= limit:
                break
    return hits


def main() -> None:
    p83 = load("8.3")
    p84 = load("8.4_aug")
    p85 = load("8.5")

    dump_slice("8.3", p83, 1025, 1115, "base-participant-agreement.txt")
    dump_slice("8.3", p83, 1121, 1208, "base-membership-agreement.txt")
    dump_slice("8.3", p83, 1212, 1292, "base-terms-of-use.txt")
    dump_slice("8.3", p83, 1296, 1412, "base-privacy-policy.txt")
    dump_slice("8.3", p83, 1415, 1503, "base-ai-disclosure.txt")

    scans = {
        "8.3-emails": search(p83, r"[\w.+-]+@thebackhalf\.org|legal@|billing@|privacy@|support@|kimberly@"),
        "8.3-regmark": search(p83, r"®|registration|trademark"),
        "8.3-august19": search(p83, r"August 19"),
        "8.3-refund": search(p83, r"refund"),
        "8.3-coppa-children": search(p83, r"COPPA|under thirteen|under 13|children"),
        "8.3-majority": search(p83, r"legal majority|eighteen"),
        "8.3-transformational": search(p83, r"transformational"),
        "8.4-guidelines": search(p84, r"Guideline|Community Standard|Architect Community"),
        "8.4-approved": search(p84, r"Approved"),
        "8.5-mailbox": search(p85, r"legal@|billing@|privacy@|kimberly@|mailbox|Version 1"),
        "8.5-legal": search(p85, r"legal@thebackhalf|billing@thebackhalf|privacy@thebackhalf"),
        "8.5-guidelines": search(p85, r"Community Guidelines|Architect Community Guidelines"),
        "8.4-emails": search(p84, r"[\w.+-]+@thebackhalf\.org"),
    }
    (OUT / "targeted-scans.json").write_text(
        json.dumps(scans, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    for key, hits in scans.items():
        print(key, len(hits))
        for hit in hits[:12]:
            print(" ", hit["i"], hit["text"][:180].replace("\n", " "))


if __name__ == "__main__":
    main()
