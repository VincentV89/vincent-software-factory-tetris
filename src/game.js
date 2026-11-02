/* Retro Nokia-style Snake & Ladder: rendering, input, sound and game flow. */
(function () {
  'use strict';
  var L = window.SnlLogic;
  var W = 132, H = 152;
  var INK = '#43523d', BG = '#c7f0d8';
  var CELL = 13, BX = 0, BY = 10; // board origin
  var canvas = document.getElementById('lcd');
  var ctx = canvas.getContext('2d');

  // ---------- 3x5 bitmap font ----------
  var GLYPHS = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
    '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
    '8': '111101111101111', '9': '111101111001110',
    ' ': '000000000000000', '!': '010010010000010', '.': '000000000000010', ':': '000010000010000',
    '-': '000000111000000', '>': '100010001010100', '<': '001010100010001', '?': '110001010000010',
    '/': '001001010100100', '+': '000010111010000', '&': '010101010101011', '*': '000101010101000'
  };

  function px(x, y, c) { ctx.fillStyle = c || INK; ctx.fillRect(x | 0, y | 0, 1, 1); }
  function rect(x, y, w, h, c) { ctx.fillStyle = c || INK; ctx.fillRect(x, y, w, h); }
  function textWidth(s, scale) { return s.length * 4 * (scale || 1) - (scale || 1); }
  function text(s, x, y, opts) {
    opts = opts || {};
    var sc = opts.scale || 1, col = opts.color || INK;
    s = String(s).toUpperCase();
    if (opts.center) x = Math.round((W - textWidth(s, sc)) / 2);
    ctx.fillStyle = col;
    for (var i = 0; i < s.length; i++) {
      var g = GLYPHS[s[i]] || GLYPHS['?'];
      for (var b = 0; b < 15; b++) {
        if (g[b] === '1') ctx.fillRect(x + i * 4 * sc + (b % 3) * sc, y + Math.floor(b / 3) * sc, sc, sc);
      }
    }
  }
  function line(x0, y0, x1, y1, c) { // Bresenham
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) {
      px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // ---------- sound (square-wave beeps, like the real thing) ----------
  var audio = null, soundOn = true;
  function beep(freq, dur, when) {
    if (!soundOn) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      var t = audio.currentTime + (when || 0);
      var o = audio.createOscillator(), g = audio.createGain();
      o.type = 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.06, t); g.gain.setValueAtTime(0, t + dur);
      o.connect(g); g.connect(audio.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* audio unavailable */ }
  }
  function tune(notes) { var t = 0; notes.forEach(function (n) { beep(n[0], n[1], t); t += n[1] + 0.02; }); }

  // ---------- board geometry ----------
  function cellOrigin(sq) { var c = L.squareToCell(sq); return { x: BX + c.col * CELL, y: BY + c.row * CELL }; }
  function cellCenter(sq) { var o = cellOrigin(sq); return { x: o.x + 6, y: o.y + 6 }; }

  // Pre-compute pixel sets for ladders and snakes so they can be drawn with a clear halo.
  function ladderPixels(a, b) {
    var p = cellCenter(a), q = cellCenter(b), set = {};
    var dx = q.x - p.x, dy = q.y - p.y, len = Math.sqrt(dx * dx + dy * dy);
    var nx = -dy / len * 2.5, ny = dx / len * 2.5;
    function add(x, y) { set[(Math.round(x)) + ',' + (Math.round(y))] = 1; }
    for (var i = 0; i <= len; i += 0.5) {
      var t = i / len, x = p.x + dx * t, y = p.y + dy * t;
      add(x + nx, y + ny); add(x - nx, y - ny);
    }
    for (var r = 3; r < len - 1; r += 4) {
      var tt = r / len, cx = p.x + dx * tt, cy = p.y + dy * tt;
      for (var k = -1; k <= 1; k += 0.25) add(cx + nx * k, cy + ny * k);
    }
    return set;
  }
  function snakePixels(a, b) {
    var p = cellCenter(a), q = cellCenter(b), set = {};
    var dx = q.x - p.x, dy = q.y - p.y, len = Math.sqrt(dx * dx + dy * dy);
    var nx = -dy / len, ny = dx / len, waves = Math.max(1.5, len / 22);
    function add(x, y) { set[(Math.round(x)) + ',' + (Math.round(y))] = 1; }
    for (var i = 0; i <= len; i += 0.4) {
      var t = i / len, amp = 3 * (1 - t * 0.6);
      var off = Math.sin(t * Math.PI * 2 * waves) * amp;
      var x = p.x + dx * t + nx * off, y = p.y + dy * t + ny * off;
      add(x, y); if (t < 0.85) add(x + 1, y);
    }
    // head: 4x4 block with an eye
    for (var hx = -2; hx <= 1; hx++) for (var hy = -2; hy <= 1; hy++) add(p.x + hx, p.y + hy);
    set['eye'] = [Math.round(p.x - 1), Math.round(p.y - 1)];
    return set;
  }
  var OVERLAYS = [];
  Object.keys(L.LADDERS).forEach(function (k) { OVERLAYS.push(ladderPixels(+k, L.LADDERS[k])); });
  Object.keys(L.SNAKES).forEach(function (k) { OVERLAYS.push(snakePixels(+k, L.SNAKES[k])); });

  function drawOverlay(set) {
    var keys = Object.keys(set).filter(function (k) { return k !== 'eye'; });
    keys.forEach(function (k) { var c = k.split(','); rect(+c[0] - 1, +c[1] - 1, 3, 3, BG); });
    keys.forEach(function (k) { var c = k.split(','); px(+c[0], +c[1]); });
    if (set.eye) px(set.eye[0], set.eye[1], BG);
  }

  function drawBoard() {
    rect(BX, BY, 10 * CELL + 1, 10 * CELL + 1, BG);
    for (var i = 0; i <= 10; i++) {
      rect(BX + i * CELL, BY, 1, 10 * CELL + 1);
      rect(BX, BY + i * CELL, 10 * CELL + 1, 1);
    }
    for (var sq = 1; sq <= 100; sq++) {
      var o = cellOrigin(sq);
      if (sq === 100) { text('WIN', o.x + 1, o.y + 2); continue; } // too wide for "100"
      text(String(sq), o.x + 2, o.y + 2);
    }
    OVERLAYS.forEach(drawOverlay);
  }

  function drawToken(idx, x, y) {
    // x,y = cell origin; P1 = filled square, P2 = hollow square with dot
    var ox = x + (idx === 0 ? 7 : 1), oy = y + 7;
    rect(ox - 1, oy - 1, 7, 7, BG);
    if (idx === 0) rect(ox, oy, 5, 5);
    else { rect(ox, oy, 5, 5); rect(ox + 1, oy + 1, 3, 3, BG); px(ox + 2, oy + 2); }
  }

  // ---------- state ----------
  var S = {
    screen: 'menu', menuIdx: 0, mode: 'cpu', players: [], turn: 0, busy: false,
    msg: '', die: 0, anim: null, winner: -1, blink: true
  };
  var MENU = ['1P VS CPU', '2 PLAYERS', 'RULES', 'SOUND'];

  function newGame(mode) {
    S.mode = mode;
    S.players = [
      { name: 'P1', pos: 0, cpu: false },
      { name: mode === 'cpu' ? 'CPU' : 'P2', pos: 0, cpu: mode === 'cpu' }
    ];
    S.turn = 0; S.busy = false; S.die = 0; S.anim = null; S.winner = -1;
    S.screen = 'game';
    S.msg = 'P1: PRESS 5';
    tune([[660, 0.08], [880, 0.08], [1320, 0.12]]);
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function takeTurn() {
    if (S.busy || S.screen !== 'game') return;
    S.busy = true;
    var p = S.players[S.turn];
    // dice shuffle
    for (var i = 0; i < 6; i++) { S.die = L.rollDie(); beep(1200 + i * 60, 0.025); await sleep(55); }
    var roll = L.rollDie();
    S.die = roll;
    S.msg = p.name + ' ROLLED ' + roll;
    await sleep(350);
    var res = L.move(p.pos, roll);
    if (res.overshoot) {
      S.msg = 'NEED ' + (L.BOARD_SIZE - p.pos) + ' TO WIN';
      beep(220, 0.15);
      await sleep(900);
    } else {
      for (var s = 0; s < res.path.length; s++) {
        p.pos = res.path[s]; beep(900, 0.03); await sleep(150);
      }
      if (res.jump) {
        var up = res.jump === 'ladder';
        S.msg = (up ? 'LADDER! ' : 'SNAKE! ') + res.landed + '>' + res.final;
        if (up) tune([[523, 0.06], [659, 0.06], [784, 0.06], [1047, 0.1]]);
        else tune([[784, 0.08], [622, 0.08], [466, 0.08], [311, 0.16]]);
        await slide(S.turn, res.landed, res.final);
        p.pos = res.final;
        await sleep(450);
      }
    }
    if (res.won) {
      S.winner = S.turn; S.screen = 'win'; S.busy = false;
      tune([[523, 0.1], [523, 0.1], [784, 0.1], [784, 0.1], [880, 0.1], [880, 0.1], [784, 0.25]]);
      return;
    }
    S.turn = 1 - S.turn;
    var next = S.players[S.turn];
    S.msg = next.cpu ? 'CPU IS ROLLING...' : next.name + ': PRESS 5';
    S.busy = false;
    if (next.cpu) { await sleep(700); takeTurn(); }
  }

  async function slide(idx, from, to) {
    var a = cellOrigin(from), b = cellOrigin(to), steps = 18;
    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      S.anim = { idx: idx, x: Math.round(a.x + (b.x - a.x) * t), y: Math.round(a.y + (b.y - a.y) * t) };
      await sleep(30);
    }
    S.anim = null;
  }

  // ---------- screens ----------
  function drawMenu() {
    text('SNAKE', 0, 10, { scale: 2, center: true });
    text('& LADDER', 0, 24, { scale: 2, center: true });
    // little pixel snake decoration
    var sx = 30;
    for (var i = 0; i < 72; i++) px(sx + i, 44 + Math.round(Math.sin(i / 4) * 2));
    rect(sx + 72, 42, 4, 4); px(sx + 74, 43, BG);
    for (var m = 0; m < MENU.length; m++) {
      var label = MENU[m] + (m === 3 ? (soundOn ? ': ON' : ': OFF') : '');
      var y = 58 + m * 12;
      if (m === S.menuIdx) { rect(14, y - 2, W - 28, 9); text(label, 0, y, { center: true, color: BG }); }
      else text(label, 0, y, { center: true });
    }
    text('2/8 MOVE  5 SELECT', 0, 118, { center: true });
    text('RETRO EDITION', 0, 138, { center: true });
  }

  var RULES = [
    'TAKE TURNS ROLLING', 'THE DIE WITH KEY 5.', '', 'LADDERS TAKE YOU', 'UP. SNAKES BITE',
    'YOU DOWN.', '', 'LAND EXACTLY ON', 'SQUARE 100 TO WIN.', '', 'YOU: SOLID BLOCK', 'RIVAL: HOLLOW BLOCK', '', 'C: BACK'
  ];
  function drawRules() {
    text('RULES', 0, 3, { center: true }); rect(4, 10, W - 8, 1);
    RULES.forEach(function (r, i) { text(r, 4, 15 + i * 9); });
  }

  function drawDie(x, y, n) {
    rect(x, y, 9, 9); rect(x + 1, y + 1, 7, 7, BG);
    var P = { 1: [[4, 4]], 2: [[2, 2], [6, 6]], 3: [[2, 2], [4, 4], [6, 6]], 4: [[2, 2], [6, 2], [2, 6], [6, 6]],
      5: [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]], 6: [[2, 2], [6, 2], [2, 4], [6, 4], [2, 6], [6, 6]] }[n] || [];
    P.forEach(function (d) { px(x + d[0], y + d[1]); });
  }

  function drawGame() {
    var p1 = S.players[0], p2 = S.players[1];
    // status bar
    rect(0, 0, 5, 5); text(p1.name + ':' + p1.pos, 7, 2);
    rect(64, 0, 5, 5); rect(65, 1, 3, 3, BG); text(p2.name + ':' + p2.pos, 71, 2);
    if (S.screen === 'game' && S.blink) { // turn marker
      var mx = S.turn === 0 ? 0 : 64; rect(mx, 7, 5, 1);
    }
    drawBoard();
    S.players.forEach(function (pl, i) {
      if (S.anim && S.anim.idx === i) drawToken(i, S.anim.x, S.anim.y);
      else if (pl.pos > 0) { var o = cellOrigin(pl.pos); drawToken(i, o.x, o.y); }
    });
    // bottom bar
    text(S.msg, 2, 144);
    if (S.die) drawDie(W - 10, 142, S.die);
  }

  function drawWin() {
    drawGame();
    rect(10, 46, W - 20, 52, BG); rect(10, 46, W - 20, 1); rect(10, 97, W - 20, 1);
    rect(10, 46, 1, 52); rect(W - 11, 46, 1, 52);
    var w = S.players[S.winner];
    if (S.blink) text(w.name + ' WINS!', 0, 54, { scale: 2, center: true });
    text(w.cpu ? 'BETTER LUCK NEXT' : 'CONGRATULATIONS!', 0, 72, { center: true });
    text('5: PLAY AGAIN', 0, 82, { center: true });
    text('C: MENU', 0, 90, { center: true });
  }

  function render() {
    rect(0, 0, W, H, BG);
    if (S.screen === 'menu') drawMenu();
    else if (S.screen === 'rules') drawRules();
    else if (S.screen === 'game') drawGame();
    else if (S.screen === 'win') drawWin();
    requestAnimationFrame(render);
  }
  setInterval(function () { S.blink = !S.blink; }, 450);

  // ---------- input ----------
  function press(key) {
    if (key === 'sound') { soundOn = !soundOn; beep(1000, 0.05); return; }
    if (S.screen === 'menu') {
      if (key === 'up') { S.menuIdx = (S.menuIdx + MENU.length - 1) % MENU.length; beep(1400, 0.02); }
      else if (key === 'down') { S.menuIdx = (S.menuIdx + 1) % MENU.length; beep(1400, 0.02); }
      else if (key === 'select') {
        beep(1800, 0.03);
        if (S.menuIdx === 0) newGame('cpu');
        else if (S.menuIdx === 1) newGame('2p');
        else if (S.menuIdx === 2) S.screen = 'rules';
        else { soundOn = !soundOn; beep(1000, 0.05); }
      }
    } else if (S.screen === 'rules') {
      if (key === 'back' || key === 'select') S.screen = 'menu';
    } else if (S.screen === 'game') {
      if (key === 'back' && !S.busy) S.screen = 'menu';
      else if (key === 'select' && !S.players[S.turn].cpu) takeTurn();
    } else if (S.screen === 'win') {
      if (key === 'select') newGame(S.mode);
      else if (key === 'back') S.screen = 'menu';
    }
  }

  document.querySelectorAll('[data-key]').forEach(function (btn) {
    btn.addEventListener('click', function () { press(btn.getAttribute('data-key')); });
  });
  var KEYMAP = {
    Enter: 'select', ' ': 'select', '5': 'select', ArrowUp: 'up', '2': 'up', ArrowDown: 'down', '8': 'down',
    Escape: 'back', Backspace: 'back', c: 'back', C: 'back', '#': 'back', m: 'sound', M: 'sound', '*': 'sound'
  };
  window.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.key];
    if (!k) return;
    e.preventDefault();
    press(k);
  });

  render();
})();
