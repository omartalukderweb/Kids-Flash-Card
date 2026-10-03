# Kids Flash Card

A flash card curriculum for kindergarten (ages 3–6): **31 decks, 517 cards**, organised by
subject and difficulty level.

The content lives in [`flashcards/decks.json`](flashcards/decks.json) — plain data, no build
step, ready for an app, a print script, or a teacher's hand-cut card set.

---

## The list

Every deck has a `level` (1 = start here, 2 = next term, 3 = end of year) and a `cardFormat`
describing what goes on the front and back of the card.

### Literacy — start of the year

| Deck | Level | Cards | Front → back |
|---|---|---|---|
| Alphabet — Uppercase | 1 | 26 | Letter → letter name + keyword picture |
| Alphabet — Lowercase | 1 | 26 | Letter → letter name |
| Letter Sounds | 1 | 26 | Letter → short sound + keyword (a as in apple) |
| First Words to Blend (CVC) | 2 | 40 | Word → picture (cat, dog, sun, pig) |
| Sight Words — Pre-Primer | 2 | 40 | Word → word in a spoken sentence |
| Sight Words — Primer | 3 | 52 | Word → word in a spoken sentence |

The two sight word decks are the standard **Dolch** Pre-Primer (40 words) and Primer (52
words) lists, verified complete against published sources.

### Numeracy

| Deck | Level | Cards | Front → back |
|---|---|---|---|
| Numbers 1–10 | 1 | 10 | Numeral → number word + that many dots |
| Count the Objects (1–10) | 1 | 10 | A picture of N objects → the numeral |
| Numbers 11–20 | 2 | 10 | Numeral → number word |

### Concepts

| Deck | Level | Cards | Front → back |
|---|---|---|---|
| Colors | 1 | 11 | Swatch → name + an object of that color |
| Shapes | 1 | 12 | Shape → name + real-world example |
| Opposites | 2 | 14 | Two pictures → the two words (big/small) |
| Position Words | 2 | 10 | Toy relative to a box → on, under, behind… |
| Comparing & Measuring | 3 | 6 | Two objects → bigger/smaller, taller/shorter… |
| Patterns, Time & Sequences | 3 | 8 | A sequence with one blank → what comes next |

### Vocabulary (naming the world)

| Deck | Level | Cards |
|---|---|---|
| My Body | 1 | 19 |
| People & Family | 1 | 14 |
| Farm Animals | 1 | 12 |
| Food & Drink | 1 | 15 |
| Clothes | 1 | 11 |
| Vehicles | 1 | 12 |
| Things at Home & School | 1 | 15 |
| Wild Animals | 2 | 12 |
| Pets, Birds, Sea & Bugs | 2 | 14 |
| Community Helpers | 2 | 12 |
| Nature, Weather & Seasons | 2 | 15 |

### Social-Emotional & Listening

| Deck | Level | Cards |
|---|---|---|
| Sounds We Hear | 1 | 10 |
| Feelings | 2 | 12 |
| Action Words | 2 | 16 |
| Good Manners & Safety | 3 | 14 |
| My Day (daily routine) | 3 | 13 |

---

## How to use them

**Keep sessions short.** Five minutes, twice a day, beats twenty minutes once. A
kindergartener's focused attention is about their age in minutes.

**Always say it aloud.** The child names the card, not you. Your job is to wait — count
silently to three before helping. The retrieval is what builds the memory.

**Sort into three piles** as you go: *knows it*, *almost*, *new*. Only the last two come back
tomorrow. This is the whole method — it is why flash cards work better than a wall chart.

**One deck per week, 5–8 new cards at a time.** Do not open the next deck until the current
one is mostly in the *knows it* pile.

**Make it physical.** Let them touch, sort, jump to the right card, or feed the "monster box"
one card per correct answer. Movement doubles retention at this age.

**Level 1 before Level 2.** Letter *names* come before letter *sounds*; sounds come before
blending CVC words; blending comes before sight words. Skipping ahead just produces guessing.

### Suggested year

| Term | Focus |
|---|---|
| Term 1 | Colors, Shapes, Numbers 1–10, Count the Objects, My Body, Farm Animals, Uppercase |
| Term 2 | Letter Sounds, Lowercase, Food, Clothes, Vehicles, Opposites, Feelings, Sounds We Hear |
| Term 3 | CVC Words, Sight Words Pre-Primer, Community Helpers, Wild Animals, Action Words, Position Words |
| Term 4 | Sight Words Primer, Numbers 11–20, Comparing, Patterns, Manners & Safety, My Day |

---

## Localising for your school

Two things to change for your own context:

1. **Language.** Add a parallel deck in your local language for the vocabulary categories. The
   alphabet and phonics decks stay English; the naming decks translate well and are often taught
   bilingually at this age.
2. **Local animals, food and community helpers.** Swap items in the vocabulary decks for things
   the children actually see. A card of something familiar beats a card of something exotic.

Both are edits to `decks.json` — no code involved.

---

## Development

Validate the card data (JSON well-formed, required fields present, no duplicate cards inside a
deck, no duplicate deck ids, prints per-deck counts):

```bash
python3 scripts/validate_decks.py
```

Exits non-zero if anything is wrong.

### Adding a deck

Append an object to the `decks` array in `flashcards/decks.json`:

```json
{
  "id": "my-new-deck",
  "name": "My New Deck",
  "category": "Vocabulary",
  "level": 1,
  "cardFormat": { "front": "picture", "back": "the word" },
  "cards": ["one", "two", "three"]
}
```

Cards may be plain strings or objects, whichever fits the deck. `id` must be unique; run the
validator after editing.
