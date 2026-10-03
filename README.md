# Kids Flash Card

A flash card app for kindergarten (ages 3–6): **31 decks, 517 cards**.

Play them on screen with three-pile sorting, or print them as fold-over A4 sheets to cut out
for the classroom.

```bash
python3 scripts/build.py   # regenerate flashcards/decks.js from decks.json (already done)
python3 -m http.server 8000 --bind 0.0.0.0
# or: npm start
```

Then open <http://localhost:8000>. The app is plain HTML/CSS/JS with no framework and no
build step — only Python 3 is needed to run it. `npm install` is only for the test suite.
Because the card data is precompiled into `flashcards/decks.js`, you can also open `index.html`
straight from the filesystem.

---

## What it does

### ▶ Flash card player — three-pile sorting

The classic method, built in. One card at a time; tap the card to reveal the answer, then sort
it into one of three piles:

| Pile | Meaning | Returns tomorrow? |
|---|---|---|
| 🟢 **Knows it** | No hesitation | No — retire it |
| 🟠 **Almost** | Hesitated, or needed a hint | Yes |
| 🔴 **New** | Didn't know it | Yes |

At the end of a round you get a tally and a **"Go again — just the N missed"** button, so the
next round is only the cards that need work. That shrinking loop is the whole point.

Keyboard: <kbd>space</kbd> flip · <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> sort ·
<kbd>u</kbd> undo · <kbd>esc</kbd> exit.

Progress is saved in the browser (localStorage), so the library shows a per-deck mastery bar
and "12 of 26 mastered · 19 seen". It survives closing the tab — useful for tracking a class
over a term. Reset it any time from the footer.

### 🖨 Print

Pick any combination of decks, choose a layout, and print:

- **Fold-over** (default) — the word on the top half, the answer on the bottom, with a dashed
  fold line between. Cut, fold, done.
- **Fronts only** — blank backs, for sticking on card stock or letting the children draw.
- **4, 6 or 8 cards per page** — 4 gives the largest cards (~94 × 68 mm folded).
- **New page per deck**, or pack tightly to save paper.

A live preview shows the first page before you print. 517 cards at 4-per-page is 138 A4 pages,
so print one deck at a time — a 12-card deck is 3 pages.

### Library

Every deck grouped by subject, searchable by deck name *or* by the words inside the cards
(searching "zebra" finds Wild Animals).

---

## The card list

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

The app is static — no bundler, no framework. Card data lives in
[`flashcards/decks.json`](flashcards/decks.json) and is compiled to `flashcards/decks.js` so the
page works from `file://`, where a browser blocks `fetch()` of a local JSON file.

```bash
npm run validate   # check decks.json
npm run build      # validate, then regenerate flashcards/decks.js
npm test           # build, then run the app's test suite
```

`decks.json` is the source of truth. **Edit it, then run `npm run build`** — the app reads the
generated `decks.js`, not the JSON.

### Validation

`scripts/validate_decks.py` checks that the JSON parses, that every deck has its required
fields, that there are no duplicate cards or deck ids, and that every card is a shape the app
knows how to render. It exits non-zero on any failure.

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

### Card shapes

Cards are plain strings, or one of these four objects. `cardSides()` in `assets/app.js` maps
each shape to a front/back pair, and the validator enforces this list — add a new shape to both
places together, or it renders as `[object Object]`.

| Shape | Front | Back |
|---|---|---|
| `"cat"` (string) | the word | the word + a draw box |
| `{letter, sound, word}` | the letter | the keyword + its sound |
| `{numeral, word}` | the numeral | the number word |
| `{shape, example}` | the shape | the example |
| `{pair: [a, b]}` | `a` | `b` — "the opposite" |

### Tests

`tests/app.test.mjs` boots the real `assets/app.js` inside jsdom and exercises the shipped code
paths — not a reimplementation:

- library and deck views render all 31 decks and all 517 cards, with no `[object Object]`
- the player flips, sorts into all three piles, undoes, and reaches the results screen
- mastery writes to localStorage and is restored on a fresh page load
- print builds A4 pages for every card, at 4/6/8 per page, in both layouts

Run with `npm test`.

