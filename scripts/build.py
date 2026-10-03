#!/usr/bin/env python3
"""Validate flashcards/decks.json, then regenerate flashcards/decks.js.

decks.js is what the web app loads. Generating it means the app works when
opened straight from the filesystem (file://), where fetch() of a .json file
is blocked by the browser.

decks.json stays the single source of truth — edit that, then run this.

    python3 scripts/build.py
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "flashcards", "decks.json")
OUT = os.path.join(ROOT, "flashcards", "decks.js")
VALIDATOR = os.path.join(ROOT, "scripts", "validate_decks.py")

HEADER = """// GENERATED FILE — do not edit by hand.
// Source of truth: flashcards/decks.json
// Regenerate with:  python3 scripts/build.py
"""


def main():
    # 1. validate first; refuse to emit bad data
    res = subprocess.run([sys.executable, VALIDATOR], cwd=ROOT)
    if res.returncode != 0:
        print("\nbuild: validation failed, decks.js NOT regenerated")
        return 1

    # 2. emit decks.js
    with open(SRC, encoding="utf-8") as fh:
        data = json.load(fh)

    body = json.dumps(data, indent=2, ensure_ascii=False, sort_keys=False)
    # keep the payload valid inside a <script> tag
    body = body.replace("</", "<\\/")

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(HEADER)
        fh.write("window.FLASHCARD_DECKS = ")
        fh.write(body)
        fh.write(";\n")

    decks = data.get("decks", [])
    cards = sum(len(d.get("cards", [])) for d in decks)
    size = os.path.getsize(OUT)
    print(f"\nbuild: wrote {os.path.relpath(OUT, ROOT)} "
          f"({len(decks)} decks, {cards} cards, {size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
