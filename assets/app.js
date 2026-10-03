/* ============================================================
   Kids Flash Cards — app
   Vanilla JS, no build step. Data comes from window.FLASHCARD_DECKS
   (generated from flashcards/decks.json by scripts/build.py).
   ============================================================ */
(function () {
  'use strict';

  var DATA = window.FLASHCARD_DECKS;
  var app = document.getElementById('app');
  var printRoot = document.getElementById('printRoot');

  var STORE = 'kfc.mastery.v1';
  var CAT_ICON = {
    'Literacy': '📖', 'Numeracy': '🔢', 'Concepts': '🔷',
    'Vocabulary': '🗣️', 'Social-Emotional': '💛', 'Listening': '👂'
  };
  var CAT_ORDER = ['Literacy', 'Numeracy', 'Concepts', 'Vocabulary', 'Social-Emotional', 'Listening'];

  /* ---------------- state ---------------- */
  var state = {
    view: 'library',
    deckId: null,
    filter: 'all',
    query: '',
    print: { perPage: 4, backs: true, breakPerDeck: true, decks: [] }
  };

  var play = null;          // active session
  var mastery = loadMastery();

  function loadMastery() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
    catch (e) { return {}; }
  }
  function saveMastery() {
    try { localStorage.setItem(STORE, JSON.stringify(mastery)); } catch (e) {}
  }

  /* ---------------- deck helpers ---------------- */
  function decks() { return DATA.decks || []; }
  function findDeck(id) {
    return decks().filter(function (d) { return d.id === id; })[0] || null;
  }

  function cardKey(card) { return JSON.stringify(card); }

  /** Normalise any card shape into { prompt, reveal, sub }.
   *  Handles: string, {letter,sound,word}, {numeral,word}, {shape,example}, {pair}
   */
  function cardSides(card) {
    if (typeof card === 'string') return { prompt: card, reveal: null, sub: null };
    if (card && card.letter)  return { prompt: card.letter, reveal: card.word, sub: card.sound };
    if (card && card.numeral) return { prompt: card.numeral, reveal: card.word, sub: null };
    if (card && card.shape)   return { prompt: card.shape, reveal: card.example, sub: 'like' };
    if (card && card.pair)    return { prompt: card.pair[0], reveal: card.pair[1], sub: 'the opposite' };
    return { prompt: String(card), reveal: null, sub: null };
  }

  /** Flat list of playable items: {deckId, deckName, card, key, sides} */
  function deckItems(deckId) {
    var d = findDeck(deckId);
    if (!d) return [];
    return d.cards.map(function (c) {
      return {
        deckId: d.id, deckName: d.name, card: c,
        key: cardKey(c), sides: cardSides(c)
      };
    });
  }

  function deckMastery(deckId) { return mastery[deckId] || {}; }
  function knownCount(deckId) {
    var m = deckMastery(deckId), n = 0;
    Object.keys(m).forEach(function (k) { if (m[k] === 'knows') n++; });
    return n;
  }

  function shuffle(a) {
    var r = a.slice();
    for (var i = r.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = r[i]; r[i] = r[j]; r[j] = t;
    }
    return r;
  }

  /* ---------------- routing ---------------- */
  function parseHash() {
    var h = (location.hash || '#/').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    if (!parts.length) return { view: 'library' };
    if (parts[0] === 'deck' && parts[1]) return { view: 'deck', deckId: parts[1] };
    if (parts[0] === 'play' && parts[1]) return { view: 'play', deckId: parts[1], mode: parts[2] || 'new' };
    if (parts[0] === 'print') return { view: 'print' };
    return { view: 'library' };
  }

  function go(path) {
    if (location.hash === '#' + path) render();
    else location.hash = path;
  }

  function render() {
    var r = parseHash();
    state.view = r.view;
    state.deckId = r.deckId || null;

    if (r.view !== 'play') play = null;

    syncNav();
    updateFoot();

    if (r.view === 'deck') return renderDeck(r.deckId);
    if (r.view === 'play') return startSession(r.deckId, r.mode);
    if (r.view === 'print') return renderPrint();
    return renderLibrary();
  }

  function syncNav() {
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.view === state.view ||
        (b.dataset.view === 'library' && (state.view === 'deck' || state.view === 'play')));
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------------- LIBRARY ---------------- */
  function renderLibrary() {
    var q = state.query.trim().toLowerCase();
    var visible = decks().filter(function (d) {
      var catOk = state.filter === 'all' || d.category === state.filter;
      var qOk = !q || d.name.toLowerCase().indexOf(q) !== -1 ||
        d.category.toLowerCase().indexOf(q) !== -1 ||
        d.cards.some(function (c) {
          return JSON.stringify(c).toLowerCase().indexOf(q) !== -1;
        });
      return catOk && qOk;
    });

    var cats = [];
    CAT_ORDER.forEach(function (c) {
      if (visible.some(function (d) { return d.category === c; })) cats.push(c);
    });
    visible.forEach(function (d) {
      if (cats.indexOf(d.category) === -1) cats.push(d.category);
    });

    var html = '';
    html += '<div class="page-head"><h1>Card library</h1>' +
      '<p>' + decks().length + ' decks · ' + totalCards() + ' cards. Pick a deck to browse, play or print it.</p></div>';

    html += '<div class="toolbar"><input class="search" id="searchBox" type="search" ' +
      'placeholder="Search decks and words…" value="' + esc(state.query) + '"></div>';

    html += '<div class="filters">';
    var chips = [{ id: 'all', label: 'All' }];
    cats.forEach(function (c) {
      var n = decks().filter(function (d) { return d.category === c; }).length;
      chips.push({ id: c, label: (CAT_ICON[c] || '') + ' ' + c + ' (' + n + ')' });
    });
    chips.forEach(function (ch) {
      html += '<button class="filter-chip' + (state.filter === ch.id ? ' is-active' : '') +
        '" data-filter="' + esc(ch.id) + '">' + esc(ch.label) + '</button>';
    });
    html += '</div>';

    if (!visible.length) {
      html += '<div class="empty"><h3>Nothing matches “' + esc(state.query) + '”</h3>' +
        '<p>Try a different word, or clear the search.</p></div>';
    }

    cats.forEach(function (cat) {
      var inCat = visible.filter(function (d) { return d.category === cat; });
      if (!inCat.length) return;
      html += '<section class="cat-group"><h2 class="cat-title">' +
        (CAT_ICON[cat] || '📚') + ' ' + esc(cat) + '</h2><div class="deck-grid">';
      inCat.forEach(function (d) { html += deckCardHTML(d); });
      html += '</div></section>';
    });

    app.innerHTML = html;

    var sb = document.getElementById('searchBox');
    sb.addEventListener('input', function (e) {
      state.query = e.target.value;
      var pos = e.target.selectionStart;
      renderLibrary();
      var again = document.getElementById('searchBox');
      if (again) { again.focus(); again.setSelectionRange(pos, pos); }
    });

    app.querySelectorAll('.filter-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        state.filter = b.dataset.filter;
        renderLibrary();
      });
    });

    app.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        go('/deck/' + b.dataset.open);
      });
    });
    app.querySelectorAll('[data-play]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        go('/play/' + b.dataset.play);
      });
    });
    app.querySelectorAll('[data-print]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        state.print.decks = [b.dataset.print];
        go('/print');
      });
    });
  }

  function deckCardHTML(d) {
    var total = d.cards.length;
    var known = knownCount(d.id);
    var pct = total ? Math.round((known / total) * 100) : 0;
    var m = deckMastery(d.id);
    var seen = Object.keys(m).length;

    return '<div class="deck-card" tabindex="0" role="button" data-open="' + esc(d.id) + '">' +
      '<div class="deck-top"><div>' +
      '<div class="deck-name">' + esc(d.name) + '</div>' +
      '<div class="deck-meta">' + total + ' cards</div>' +
      '</div><span class="level-dot lv' + d.level + '" title="Level ' + d.level + '">' + d.level + '</span></div>' +
      '<div class="mastery"><div class="mastery-bar"><div class="mastery-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="mastery-label">' + (seen ? known + ' of ' + total + ' mastered · ' + seen + ' seen'
        : 'not started yet') + '</div></div>' +
      '<div class="deck-actions">' +
      '<button class="mini-btn play" data-play="' + esc(d.id) + '">▶ Play</button>' +
      '<button class="mini-btn" data-print="' + esc(d.id) + '">🖨 Print</button>' +
      '</div></div>';
  }

  function totalCards() {
    return decks().reduce(function (n, d) { return n + d.cards.length; }, 0);
  }

  /* ---------------- DECK VIEW ---------------- */
  function renderDeck(deckId) {
    var d = findDeck(deckId);
    if (!d) { location.hash = '/'; return; }

    var m = deckMastery(d.id);
    var items = deckItems(d.id);

    var html = '<div class="back-row"><button class="chip-back" data-back>← All decks</button></div>';
    html += '<div class="page-head"><h1>' + (CAT_ICON[d.category] || '') + ' ' + esc(d.name) + '</h1>' +
      '<p>' + esc(d.cardFormat ? (d.cardFormat.front + ' → ' + d.cardFormat.back) : d.category) + '</p></div>';

    html += '<div class="deck-summary">' +
      '<span class="pill">Level ' + d.level + '</span>' +
      '<span class="pill">' + d.category + '</span>' +
      '<span class="pill">' + items.length + ' cards</span>' +
      '<span class="pill">' + knownCount(d.id) + ' mastered</span>' +
      '</div>';

    html += '<div class="action-row">' +
      '<button class="btn big" data-playdeck>▶ Play this deck</button>' +
      '<button class="btn ghost" data-printdeck>🖨 Print cards</button>' +
      (Object.keys(m).length ? '<button class="btn ghost" data-cleardeck>Clear saved progress</button>' : '') +
      '</div>';

    html += '<div class="card-wall">';
    items.forEach(function (it) {
      var s = it.sides;
      var st = m[it.key] || '';
      html += '<div class="wall-card"' + (st ? ' data-state="' + st + '"' : '') + '>' +
        '<div class="wall-front">' + esc(s.prompt) + '</div>' +
        (s.reveal ? '<div class="wall-back">' + esc(s.sub ? s.sub + ' ' : '') + esc(s.reveal) + '</div>' : '') +
        '</div>';
    });
    html += '</div>';

    app.innerHTML = html;
    bindCommon();

    app.querySelector('[data-playdeck]').addEventListener('click', function () { go('/play/' + d.id); });
    app.querySelector('[data-printdeck]').addEventListener('click', function () {
      state.print.decks = [d.id]; go('/print');
    });
    var clr = app.querySelector('[data-cleardeck]');
    if (clr) clr.addEventListener('click', function () {
      if (confirm('Clear saved progress for “' + d.name + '”?')) {
        delete mastery[d.id]; saveMastery(); renderDeck(d.id); toast('Progress cleared');
      }
    });
  }

  /* ---------------- PLAYER (three-pile sorting) ---------------- */
  function startSession(deckId, mode) {
    var items;
    if (deckId === '__mixed__') {
      items = shuffle(allItems()).slice(0, 20);
    } else {
      items = deckItems(deckId);
      if (!items.length) { location.hash = '/'; return; }
    }

    if (mode === 'again' && play && play.missed && play.missed.length) {
      items = play.missed.slice();
    }

    play = {
      deckId: deckId,
      queue: shuffle(items),
      index: 0,
      flipped: false,
      piles: { knows: [], almost: [], new: [] },
      missed: [],
      finished: false
    };
    renderPlayer();
  }

  function allItems() {
    var out = [];
    decks().forEach(function (d) { out = out.concat(deckItems(d.id)); });
    return out;
  }

  function renderPlayer() {
    if (!play) return;
    if (play.finished) return renderResults();

    var total = play.queue.length;
    var i = play.index;
    var it = play.queue[i];
    var s = it.sides;
    var answered = play.piles.knows.length + play.piles.almost.length + play.piles.new.length;
    var pct = total ? Math.round((answered / total) * 100) : 0;
    var d = findDeck(play.deckId);
    var label = play.deckId === '__mixed__' ? 'Mixed review' : (d ? d.name : '');

    var html = '<div class="player">';
    html += '<div class="player-head">' +
      '<button class="chip-back" data-exit>← Exit</button>' +
      '<span class="counter">' + (i + 1) + ' of ' + total + ' · ' + esc(label) + '</span>' +
      '<button class="chip-back" data-undo' + (i === 0 ? ' disabled style="opacity:.4"' : '') + '>↺ Undo</button>' +
      '</div>';
    html += '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>';

    html += '<div class="flashcard' + (play.flipped ? ' is-flipped' : '') + '" id="flashcard">' +
      '<button class="tap-zone" id="flipBtn" aria-label="Flip the card">' +
      '<div class="flashcard-inner">' +

      '<div class="face face-front">' +
      '<span class="face-tag">' + esc(label) + '</span>' +
      '<div class="face-big">' + esc(s.prompt) + '</div>' +
      '</div>' +

      '<div class="face face-back">' +
      '<span class="face-tag">' + esc(label) + '</span>' +
      (s.reveal
        ? '<div class="face-big">' + esc(s.reveal) + '</div>' +
          (s.sub ? '<div class="face-sub">' + esc(s.sub) + '</div>' : '')
        : '<div class="face-big">' + esc(s.prompt) + '</div>' +
          '<div class="draw-box">draw it or act it out</div>') +
      '</div>' +

      '</div></button></div>';

    html += '<p class="flip-hint">' + (play.flipped
      ? 'Which pile does it go in?'
      : 'Tap the card (or press space) to reveal the answer') + '</p>';

    html += '<div class="piles">' +
      pileBtn('knows', 'Knows it', play.piles.knows.length) +
      pileBtn('almost', 'Almost', play.piles.almost.length) +
      pileBtn('new', 'New', play.piles.new.length) +
      '</div>';

    html += '<div class="shortcut-legend">' +
      '<kbd>space</kbd> flip &nbsp; <kbd>1</kbd> knows &nbsp; <kbd>2</kbd> almost &nbsp; ' +
      '<kbd>3</kbd> new &nbsp; <kbd>u</kbd> undo' +
      '</div>';
    html += '</div>';

    app.innerHTML = html;
    bindCommon();

    document.getElementById('flipBtn').addEventListener('click', function () {
      play.flipped = true; renderPlayer();
    });
    app.querySelectorAll('.pile-btn').forEach(function (b) {
      b.addEventListener('click', function () { answer(b.dataset.pile); });
    });
    app.querySelector('[data-exit]').addEventListener('click', function () {
      go('/deck/' + play.deckId);
    });
    var u = app.querySelector('[data-undo]');
    if (u && i > 0) u.addEventListener('click', undo);
  }

  function pileBtn(id, label, n) {
    return '<button class="pile-btn pile-' + id + '" data-pile="' + id + '"' +
      (play.flipped ? '' : ' disabled') + '>' +
      label + '<small>' + n + '</small></button>';
  }

  function answer(pile) {
    if (!play || !play.flipped) return;
    var it = play.queue[play.index];
    play.piles[pile].push(it);
    if (pile !== 'knows') play.missed.push(it);

    if (!mastery[it.deckId]) mastery[it.deckId] = {};
    mastery[it.deckId][it.key] = pile;
    saveMastery();

    play.flipped = false;
    play.index++;
    if (play.index >= play.queue.length) play.finished = true;
    renderPlayer();
  }

  function undo() {
    if (!play || play.index === 0) return;
    play.index--;
    var it = play.queue[play.index];
    ['knows', 'almost', 'new'].forEach(function (p) {
      var arr = play.piles[p];
      for (var i = arr.length - 1; i >= 0; i--) {
        if (arr[i] === it) { arr.splice(i, 1); break; }
      }
    });
    for (var j = play.missed.length - 1; j >= 0; j--) {
      if (play.missed[j] === it) { play.missed.splice(j, 1); break; }
    }
    // roll back the mastery record written by answer()
    if (mastery[it.deckId]) {
      delete mastery[it.deckId][it.key];
      saveMastery();
    }
    play.finished = false;
    play.flipped = false;
    renderPlayer();
  }

  function renderResults() {
    var k = play.piles.knows.length, a = play.piles.almost.length, n = play.piles.new.length;
    var total = play.queue.length;
    var pct = total ? Math.round((k / total) * 100) : 0;
    var missed = play.piles.almost.length + play.piles.new.length;
    var d = findDeck(play.deckId);
    var label = play.deckId === '__mixed__' ? 'Mixed review' : (d ? d.name : 'this deck');

    var msg = pct === 100 ? 'Perfect round! 🎉'
      : pct >= 70 ? 'Great work! 👏'
      : pct >= 40 ? 'Getting there! 💪'
      : 'Good start — practice makes it stick. 🌱';

    var html = '<div class="results">' +
      '<h2>' + msg + '</h2>' +
      '<p class="sub">' + esc(label) + ' · ' + total + ' cards · ' + pct + '% mastered this round</p>' +
      '<div class="tally">' +
      '<div class="tally-cell" style="background:var(--knows)"><div class="tally-num">' + k + '</div><div class="tally-lab">Knows it</div></div>' +
      '<div class="tally-cell" style="background:var(--almost)"><div class="tally-num">' + a + '</div><div class="tally-lab">Almost</div></div>' +
      '<div class="tally-cell" style="background:var(--new)"><div class="tally-num">' + n + '</div><div class="tally-lab">New</div></div>' +
      '</div>' +
      '<div class="results-actions">' +
      (missed ? '<button class="btn" data-again>↺ Go again — just the ' + missed + ' missed</button>' : '') +
      '<button class="btn ' + (missed ? 'ghost' : '') + '" data-replay>▶ Play the whole deck again</button>' +
      '<button class="btn ghost" data-done>✓ Done</button>' +
      '</div></div>';

    app.innerHTML = html;
    bindCommon();

    var ag = app.querySelector('[data-again]');
    if (ag) ag.addEventListener('click', function () { startSession(play.deckId, 'again'); });
    app.querySelector('[data-replay]').addEventListener('click', function () {
      startSession(play.deckId, 'new');
    });
    app.querySelector('[data-done]').addEventListener('click', function () {
      go(play.deckId === '__mixed__' ? '/' : '/deck/' + play.deckId);
    });
  }

  /* ---------------- PRINT ---------------- */
  function allSelectedItems() {
    var sel = state.print.decks.length ? state.print.decks : decks().map(function (d) { return d.id; });
    var out = [];
    sel.forEach(function (id) { out = out.concat(deckItems(id)); });
    return out;
  }

  function buildPages(items, perPage, opts) {
    var pages = [], page = [], pageDeck = null;
    items.forEach(function (it) {
      if (opts.breakPerDeck && page.length && pageDeck !== it.deckId) {
        pages.push(page); page = [];
      }
      if (page.length >= perPage) { pages.push(page); page = []; }
      page.push(it); pageDeck = it.deckId;
    });
    if (page.length) pages.push(page);
    return pages;
  }

  function printCardHTML(it, opts, fontSize) {
    var s = it.sides;
    var front = '<div class="pc-half front">' +
      '<div class="pc-deck-tag" style="font-size:' + Math.max(7, fontSize * 0.32) + 'mm">' +
      esc(it.deckName) + '</div>' +
      '<div class="pc-word" style="font-size:' + fontSize + 'mm">' + esc(s.prompt) + '</div>' +
      '</div>';

    if (!opts.backs) {
      return '<div class="print-card">' +
        '<div class="pc-half" style="min-height:100%">' +
        '<div class="pc-deck-tag" style="font-size:' + Math.max(7, fontSize * 0.32) + 'mm">' +
        esc(it.deckName) + '</div>' +
        '<div class="pc-word" style="font-size:' + fontSize + 'mm">' + esc(s.prompt) + '</div>' +
        '</div></div>';
    }

    var back = '<div class="pc-half back">' +
      (s.reveal
        ? '<div class="pc-word" style="font-size:' + fontSize + 'mm">' + esc(s.reveal) + '</div>' +
          (s.sub ? '<div class="pc-sub" style="font-size:' + Math.max(7, fontSize * 0.4) + 'mm">' + esc(s.sub) + '</div>' : '')
        : '<div class="pc-word" style="font-size:' + fontSize + 'mm">' + esc(s.prompt) + '</div>' +
          '<div class="pc-hint" style="font-size:' + Math.max(7, fontSize * 0.36) + 'mm">draw it here</div>') +
      '</div>';

    return '<div class="print-card">' + front + back + '</div>';
  }

  function sheetHTML(pageItems, opts) {
    var per = opts.perPage;
    var cols = 2;
    var rows = Math.ceil(per / cols);
    var gap = 4;                       // mm
    var pageH = 297 - 16;              // A4 minus 8mm margins
    var pageW = 210 - 16;
    var cardH = (pageH - gap * (rows - 1)) / rows;
    var cardW = (pageW - gap * (cols - 1)) / cols;
    var fontSize = opts.backs ? cardH * 0.155 : cardH * 0.20;

    var inner = pageItems.map(function (it) {
      return printCardHTML(it, opts, fontSize);
    }).join('');

    return '<div class="print-page" style="grid-template-columns:repeat(' + cols + ',' + cardW + 'mm);' +
      'grid-auto-rows:' + cardH + 'mm;gap:' + gap + 'mm;width:' + pageW + 'mm">' + inner + '</div>';
  }

  function renderPrint() {
    var items = allSelectedItems();
    var pages = buildPages(items, state.print.perPage, state.print);

    var html = '<div class="back-row"><button class="chip-back" data-back>← All decks</button></div>';
    html += '<div class="page-head"><h1>Print cards</h1>' +
      '<p>Cut along the borders and fold each card in half — the word is on the front, the answer on the back.</p></div>';

    html += '<div class="print-panel">';

    html += '<div class="field"><span class="field-label">Layout</span><div class="seg">' +
      seg('backs', true, 'Fold-over (front + back)') +
      seg('backs', false, 'Fronts only') +
      '</div></div>';

    html += '<div class="field"><span class="field-label">Cards per page</span><div class="seg">' +
      seg('perPage', 4, '4 · large') +
      seg('perPage', 6, '6 · medium') +
      seg('perPage', 8, '8 · small') +
      '</div></div>';

    if (state.print.decks.length > 1) {
      html += '<div class="field"><span class="field-label">Page breaks</span><div class="seg">' +
        seg('breakPerDeck', true, 'New page for each deck') +
        seg('breakPerDeck', false, 'Pack tightly') +
        '</div></div>';
    }

    html += '<div class="field"><span class="field-label">Decks to print (' +
      (state.print.decks.length || decks().length) + ' selected · ' + items.length + ' cards · ' +
      pages.length + ' pages)</span><div class="deck-pick">';
    decks().forEach(function (d) {
      var on = !state.print.decks.length || state.print.decks.indexOf(d.id) !== -1;
      html += '<button class="pick' + (on ? ' is-active' : '') + '" data-toggle="' + esc(d.id) + '">' +
        esc(d.name) + ' <span class="n">' + d.cards.length + '</span></button>';
    });
    html += '</div></div>';

    html += '<div class="field"><button class="btn big" id="doPrint" ' +
      (items.length ? '' : 'disabled style="opacity:.4"') + '>🖨 Print ' + items.length +
      ' cards (' + pages.length + ' pages)</button></div>';

    html += '</div>';

    html += '<h2 class="cat-title">Preview — page 1 of ' + pages.length + '</h2>';
    html += '<div class="print-preview" id="pvWrap"></div>';
    html += '<p class="preview-note">Showing page 1 at reduced size. Your printer will produce A4 pages.</p>';

    app.innerHTML = html;
    bindCommon();

    app.querySelectorAll('[data-seg]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.seg;
        var v = b.dataset.val === 'true' ? true : b.dataset.val === 'false' ? false : Number(b.dataset.val);
        state.print[k] = v;
        renderPrint();
      });
    });

    app.querySelectorAll('[data-toggle]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.toggle;
        if (!state.print.decks.length) {
          state.print.decks = decks().map(function (d) { return d.id; });
        }
        var i = state.print.decks.indexOf(id);
        if (i === -1) state.print.decks.push(id);
        else state.print.decks.splice(i, 1);
        renderPrint();
      });
    });

    var pv = document.getElementById('pvWrap');
    if (pages.length) {
      pv.innerHTML = sheetHTML(pages[0], state.print);
      fitPreview(pv);
    } else {
      pv.innerHTML = '<div class="empty"><h3>No decks selected</h3><p>Pick at least one deck above.</p></div>';
    }

    var dp = document.getElementById('doPrint');
    if (dp && items.length) dp.addEventListener('click', function () { doPrint(pages); });
  }

  function seg(key, val, label) {
    var active = state.print[key] === val;
    return '<button class="seg-btn' + (active ? ' is-active' : '') + '" data-seg="' + key +
      '" data-val="' + val + '">' + esc(label) + '</button>';
  }

  function fitPreview(wrap) {
    var sheet = wrap.querySelector('.print-page');
    if (!sheet) return;
    var mmToPx = 96 / 25.4;
    var naturalW = (210 - 16) * mmToPx;
    var avail = wrap.clientWidth - 2;
    var scale = Math.min(1, avail / naturalW);
    sheet.style.transform = 'scale(' + scale + ')';
    sheet.style.transformOrigin = 'top left';
    wrap.style.height = (sheet.offsetHeight * scale + 4) + 'px';
  }

  function doPrint(pages) {
    printRoot.innerHTML = pages.map(function (p) {
      return sheetHTML(p, state.print);
    }).join('');
    window.print();
  }

  window.addEventListener('afterprint', function () { printRoot.innerHTML = ''; });

  /* ---------------- shared ---------------- */
  function bindCommon() {
    var b = app.querySelector('[data-back]');
    if (b) b.addEventListener('click', function () { go('/'); });
    updateFoot();
  }

  function updateFoot() {
    var el = document.getElementById('footStats');
    var seen = 0, known = 0;
    decks().forEach(function (d) {
      var m = deckMastery(d.id);
      seen += Object.keys(m).length;
      known += knownCount(d.id);
    });
    el.textContent = decks().length + ' decks · ' + totalCards() + ' cards · ' +
      known + ' mastered · ' + seen + ' seen';
  }

  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  /* ---------------- boot ---------------- */
  document.getElementById('brandBtn').addEventListener('click', function () { go('/'); });
  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () { go('/' + b.dataset.view); });
  });
  document.getElementById('resetProgress').addEventListener('click', function () {
    if (confirm('Clear ALL saved progress across every deck?')) {
      mastery = {}; saveMastery(); render(); toast('All progress cleared');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    if (state.view !== 'play' || !play || play.finished) return;

    if (e.code === 'Space') {
      e.preventDefault();
      play.flipped = true; renderPlayer();
    } else if (e.key === '1') { answer('knows'); }
    else if (e.key === '2') { answer('almost'); }
    else if (e.key === '3') { answer('new'); }
    else if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') { e.preventDefault(); undo(); }
    else if (e.key === 'Escape') { go('/deck/' + play.deckId); }
  });

  window.addEventListener('hashchange', render);

  if (!DATA || !DATA.decks) {
    app.innerHTML = '<div class="empty"><h1>Card data not found</h1>' +
      '<p>flashcards/decks.js is missing. Run <code>python3 scripts/build.py</code>.</p></div>';
    return;
  }

  if (!location.hash) location.hash = '/';
  render();
})();
