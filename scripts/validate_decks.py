#!/usr/bin/env python3
"""Validate flashcards/decks.json.

Checks: valid JSON, required fields, no duplicate cards inside a deck,
and reports card counts per deck. Exit code 1 on any failure.
"""
import collections
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "flashcards", "decks.json")
REQUIRED = ("id", "name", "category", "level", "cards")


def card_key(card):
    """Stable, hashable identity for a card."""
    if isinstance(card, dict):
        return json.dumps(card, sort_keys=True)
    return json.dumps(card)


def main():
    with open(PATH, encoding="utf-8") as fh:
        data = json.load(fh)

    errors = []
    decks = data.get("decks", [])
    if not decks:
        errors.append("no decks found")

    seen_ids = collections.Counter()
    total = 0

    print(f"{'deck':42} {'cat':18} {'lvl':>3} {'cards':>6}")
    print("-" * 73)
    for deck in decks:
        missing = [f for f in REQUIRED if f not in deck]
        if missing:
            errors.append(f"deck {deck.get('id', '?')} missing fields: {missing}")
            continue

        seen_ids[deck["id"]] += 1
        n = len(deck["cards"])
        total += n
        print(f"{deck['name']:42.42} {deck['category']:18.18} {deck['level']:>3} {n:>6}")

        if n == 0:
            errors.append(f"deck {deck['id']} has no cards")

        keys = [card_key(c) for c in deck["cards"]]
        dupes = sorted(w for w, c in collections.Counter(keys).items() if c > 1)
        if dupes:
            errors.append(f"deck {deck['id']} duplicate cards: {dupes}")

    print("-" * 73)
    print(f"{len(decks)} decks, {total} cards")

    for deck_id, count in seen_ids.items():
        if count > 1:
            errors.append(f"duplicate deck id: {deck_id} (x{count})")

    if errors:
        print("\nFAILED:")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("\nOK: decks.json is valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
