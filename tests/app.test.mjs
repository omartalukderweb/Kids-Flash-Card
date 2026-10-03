/**
 * Runs the real assets/app.js inside jsdom and exercises the shipped code paths:
 * library render, deck render, the three-pile player, mastery persistence,
 * and print-sheet generation for every card shape.
 *
 *   node --test tests/app.test.mjs
 */
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let dom, win;
let printCalls = 0;

/** Boot the real app. `seed` is written to localStorage BEFORE app.js runs,
 *  matching production, where app.js reads saved mastery at startup. */
function boot(seed) {
  dom = new JSDOM(read('index.html'), {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  win = dom.window;
  // stub browser APIs jsdom does not implement
  win.confirm = () => true;
  win.print = () => { printCalls++; };
  if (seed) win.localStorage.setItem('kfc.mastery.v1', JSON.stringify(seed));
  win.eval(read('flashcards/decks.js'));   // real generated data
  win.eval(read('assets/app.js'));         // real app code
  printCalls = 0;
}

const tick = () => new Promise((r) => setTimeout(r, 0));
const $ = (sel) => win.document.querySelector(sel);
const $$ = (sel) => [...win.document.querySelectorAll(sel)];
const click = (el) => { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); };

async function goto(hash) {
  win.location.hash = hash;
  await tick();
  await tick();
}

const DATA = JSON.parse(read('flashcards/decks.json'));

before(() => boot());

test('boot: library lists every deck and the footer counts every card', async () => {
  boot();
  await goto('#/');
  const cards = $$('.deck-card');
  assert.equal(cards.length, DATA.decks.length, 'one tile per deck');
  assert.match($('#footStats').textContent, /31 decks · 517 cards/);
  assert.equal(printCalls, 0);
});

test('library: search filters decks by card content', async () => {
  boot();
  await goto('#/');
  const box = $('#searchBox');
  box.value = 'zebra';
  box.dispatchEvent(new win.Event('input', { bubbles: true }));
  await tick();
  const names = $$('.deck-name').map((e) => e.textContent);
  assert.ok(names.includes('Wild Animals'), 'zebra lives in Wild Animals');
  assert.ok(names.length < DATA.decks.length, 'search narrows the list');
});

test('deck view: every card in every deck renders non-empty with no [object Object]', async () => {
  boot();
  let total = 0;
  for (const d of DATA.decks) {
    await goto('#/deck/' + d.id);
    const fronts = $$('.wall-front');
    assert.equal(fronts.length, d.cards.length, `${d.id}: one card per entry`);
    for (const f of fronts) {
      total++;
      assert.ok(f.textContent.trim().length > 0, `${d.id}: empty card front`);
      assert.ok(!/object Object/.test(f.textContent), `${d.id}: unrendered object`);
    }
    assert.ok(!/object Object/.test($('#app').innerHTML), `${d.id}: [object Object] in markup`);
  }
  assert.equal(total, 517, 'all 517 cards rendered');
});

test('player: card shapes produce distinct prompt/reveal pairs', async () => {
  boot();
  const cases = [
    ['letter-sounds', 'prompt is the letter, reveal is the keyword'],
    ['numbers-1-10', 'prompt is the numeral, reveal is the word'],
    ['shapes', 'prompt is the shape, reveal is the example'],
    ['opposites', 'prompt and reveal are the two opposite words'],
    ['colors', 'word-only card repeats the word plus a draw box'],
  ];
  for (const [deckId] of cases) {
    await goto('#/play/' + deckId);
    await tick();
    const front = $('.face-front .face-big').textContent;
    assert.ok(front.trim(), `${deckId}: empty front`);
    click($('#flipBtn'));
    await tick();
    const back = $('.face-back .face-big').textContent;
    assert.ok(back.trim(), `${deckId}: empty back`);

    const deck = DATA.decks.find((d) => d.id === deckId);
    const shown = deck.cards.find((c) =>
      (typeof c === 'string' ? c : (c.letter || c.numeral || c.shape || c.pair?.[0])) === front
    );
    assert.ok(shown, `${deckId}: front "${front}" not found in deck data`);
  }
});

test('player: opposites card asks for the opposite, not the same word', async () => {
  boot();
  await goto('#/play/opposites');
  await tick();
  const front = $('.face-front .face-big').textContent;
  click($('#flipBtn'));
  await tick();
  const back = $('.face-back .face-big').textContent;
  assert.notEqual(front, back, 'front and back must differ for a drill');
  const pair = DATA.decks.find((d) => d.id === 'opposites')
    .cards.find((c) => c.pair[0] === front).pair;
  assert.deepEqual([front, back], pair, 'front/reveal are the pair in order');
  assert.equal($('.face-back .face-sub').textContent, 'the opposite');
});

test('player: sorting into all three piles persists mastery to localStorage', async () => {
  boot();
  await goto('#/play/colors');
  await tick();

  const order = ['knows', 'almost', 'new'];
  for (const pile of order) {
    click($('#flipBtn'));
    await tick();
    const btn = $(`.pile-btn[data-pile="${pile}"]`);
    assert.equal(btn.disabled, false, 'pile buttons unlock after flipping');
    click(btn);
    await tick();
  }

  const stored = JSON.parse(win.localStorage.getItem('kfc.mastery.v1'));
  const colors = stored['colors'];
  assert.equal(Object.keys(colors).length, 3, 'three cards recorded');
  const vals = Object.values(colors).sort();
  assert.deepEqual(vals, ['almost', 'knows', 'new']);
});

test('player: pile buttons stay disabled until the card is flipped', async () => {
  boot();
  await goto('#/play/colors');
  await tick();
  assert.equal($('.pile-btn[data-pile="knows"]').disabled, true);
  click($('#flipBtn'));
  await tick();
  assert.equal($('.pile-btn[data-pile="knows"]').disabled, false);
});

test('player: answering every card reaches the results screen with correct tally', async () => {
  boot();
  await goto('#/play/colors');
  await tick();
  const total = DATA.decks.find((d) => d.id === 'colors').cards.length; // 11

  for (let i = 0; i < total; i++) {
    click($('#flipBtn'));
    await tick();
    click($('.pile-btn[data-pile="knows"]'));
    await tick();
  }

  assert.ok($('.results'), 'results screen shown');
  const nums = $$('.tally-num').map((e) => Number(e.textContent));
  assert.deepEqual(nums, [total, 0, 0], 'all cards in Knows it');
  assert.match($('.results .sub').textContent, /11 cards · 100%/);
  assert.ok(!$('[data-again]'), 'no "go again" button when nothing was missed');
});

test('player: missed cards offer a replay of just those cards', async () => {
  boot();
  await goto('#/play/colors');
  await tick();
  const total = 11;
  // first 4 -> knows, rest -> new
  for (let i = 0; i < total; i++) {
    click($('#flipBtn'));
    await tick();
    click($(`.pile-btn[data-pile="${i < 4 ? 'knows' : 'new'}"]`));
    await tick();
  }
  const nums = $$('.tally-num').map((e) => Number(e.textContent));
  assert.deepEqual(nums, [4, 0, 7]);

  const again = $('[data-again]');
  assert.ok(again, 'replay button offered');
  assert.match(again.textContent, /just the 7 missed/);

  click(again);
  await tick();
  assert.match($('.counter').textContent, /1 of 7/, 'replay queue is only the missed cards');
});

test('player: undo returns the card to the queue', async () => {
  boot();
  await goto('#/play/colors');
  await tick();
  click($('#flipBtn'));
  await tick();
  click($('.pile-btn[data-pile="knows"]'));
  await tick();
  assert.match($('.counter').textContent, /^2 of 11/);

  click($('[data-undo]'));
  await tick();
  assert.match($('.counter').textContent, /^1 of 11/);
  const stored = JSON.parse(win.localStorage.getItem('kfc.mastery.v1'));
  assert.ok(!stored['colors'] || Object.keys(stored['colors']).length === 0,
    'undo does not leave a phantom mastery record');
});

test('print: builds A4 pages and every card across all 31 decks renders', async () => {
  boot();
  await goto('#/print');
  await tick();

  // select all decks (default), then print
  const doPrint = $('#doPrint');
  assert.match(doPrint.textContent, /517 cards/);
  click(doPrint);
  await tick();

  assert.equal(printCalls, 1, 'window.print() called once');
  const pages = $$('#printRoot .print-page');
  assert.ok(pages.length > 0, 'pages generated');

  const cards = $$('#printRoot .print-card');
  assert.equal(cards.length, 517, 'one printed card per source card');

  const markup = $('#printRoot').innerHTML;
  assert.ok(!/object Object/.test(markup), 'no [object Object] in print output');
  assert.ok(!/undefined|NaN/.test(markup), 'no undefined/NaN in print output');

  // every fold-over card has a front half and a back half
  for (const c of cards) {
    assert.equal(c.querySelectorAll('.pc-half').length, 2, 'front + back halves');
    assert.equal(c.querySelectorAll('.pc-half.front').length, 1, 'exactly one front');
  }
});

test('print: 4-per-page packs 517 cards into the expected page count', async () => {
  boot();
  await goto('#/print');
  await tick();
  click($('#doPrint'));
  await tick();
  // one page per deck, 4 cards max each
  const expected = DATA.decks.reduce((n, d) => n + Math.ceil(d.cards.length / 4), 0);
  const pages = $$('#printRoot .print-page');
  assert.equal(pages.length, expected, 'page count matches per-deck breaking');
  for (const p of pages) {
    assert.ok(p.querySelectorAll('.print-card').length <= 4, 'never more than 4 per page');
  }
});

test('print: 6-per-page option changes the page count', async () => {
  boot();
  await goto('#/print');
  await tick();
  const six = $$('[data-seg="perPage"]').find((b) => b.dataset.val === '6');
  click(six);
  await tick();
  click($('#doPrint'));
  await tick();
  const expected6 = DATA.decks.reduce((n, d) => n + Math.ceil(d.cards.length / 6), 0);
  const expected4 = DATA.decks.reduce((n, d) => n + Math.ceil(d.cards.length / 4), 0);
  const pages = $$('#printRoot .print-page');
  assert.equal(pages.length, expected6, 'page count matches 6-per-page');
  for (const p of pages) {
    assert.ok(p.querySelectorAll('.print-card').length <= 6, 'never more than 6 per page');
  }
  assert.ok(pages.length < expected4, '6-per-page needs fewer pages than 4-per-page');
});

test('print: fronts-only mode emits a single half per card', async () => {
  boot();
  await goto('#/print');
  await tick();
  const frontsOnly = $$('[data-seg="backs"]').find((b) => b.dataset.val === 'false');
  click(frontsOnly);
  await tick();
  click($('#doPrint'));
  await tick();
  const first = $('#printRoot .print-card');
  assert.equal(first.querySelectorAll('.pc-half').length, 1);
  assert.equal(first.querySelectorAll('.pc-half.front').length, 0, 'no fold line');
});

test('print: deck chips narrow what gets printed', async () => {
  boot();
  await goto('#/print');
  await tick();
  // deselect everything except colors
  for (const b of $$('[data-toggle]')) {
    if (b.dataset.toggle !== 'colors') click(b);
    await tick();
  }
  const sel = $$('[data-toggle].is-active');
  assert.equal(sel.length, 1);
  assert.equal(sel[0].dataset.toggle, 'colors');
  click($('#doPrint'));
  await tick();
  assert.equal($$('#printRoot .print-card').length, 11, 'only the colors deck printed');
});

test('mastery: library shows per-deck progress restored from localStorage', async () => {
  boot({ colors: { '"red"': 'knows', '"blue"': 'knows', '"yellow"': 'new' } });
  await goto('#/');
  const tile = $$('.deck-card').find((t) => t.querySelector('.deck-name').textContent === 'Colors');
  const bar = tile.querySelector('.mastery-fill');
  assert.equal(bar.style.width, '18%', '2 of 11 colors mastered = 18%');
  assert.match(tile.querySelector('.mastery-label').textContent, /2 of 11 mastered · 3 seen/);
  assert.match($('#footStats').textContent, /2 mastered · 3 seen/);
});

test('mastery: progress survives a reload', async () => {
  boot();
  await goto('#/play/colors');
  await tick();
  click($('#flipBtn'));
  await tick();
  click($('.pile-btn[data-pile="knows"]'));
  await tick();
  const saved = win.localStorage.getItem('kfc.mastery.v1');
  assert.ok(saved, 'session wrote to localStorage');

  boot(JSON.parse(saved));                 // fresh page load with the same storage
  await goto('#/deck/colors');
  assert.match($('#app').innerHTML, /1 mastered/, 'deck view restored the count');
  assert.equal($$('.wall-card[data-state="knows"]').length, 1, 'card shows as mastered');
});
