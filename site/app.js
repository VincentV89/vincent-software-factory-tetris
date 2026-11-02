/* Nokia-style Snakes & Ladders - rendering, input, sound. */
(function () {
  'use strict';

  const SL = window.SnakesLadders;
  const Font = window.LcdFont;

  const W = 136;
  const H = 83;
  const CELL = 8;
  const BX = 1; // board origin
  const BY = 1;
  const PANEL_X = 85;
  const LCD_BG = '#c7f0d8';
  const LCD_FG = '#43523d';

  const canvas = document.getElementById('lcd');
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;

  // ---------- settings ----------
  let soundOn = true;
  try {
    soundOn = localStorage.getItem('sl-sound') !== 'off';
  } catch (e) { /* storage unavailable */ }

  // ---------- sound (square-wave beeps, very Nokia) ----------
  let audio = null;
  function beep(freq, ms, delay) {
    if (!soundOn) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t0 = audio.currentTime + (delay || 0) / 1000;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, t0);
      gain.gain.setValueAtTime(0, t0 + ms / 1000);
      osc.connect(gain).connect(audio.destination);
      osc.start(t0);
      osc.stop(t0 + ms / 1000 + 0.02);
    } catch (e) { /* audio unsupported */ }
  }
  function melody(notes) {
    let t = 0;
    notes.forEach(function (n) { beep(n[0], n[1], t); t += n[1] + 20; });
  }
  const SFX = {
    key: function () { beep(1200, 25); },
    step: function () { beep(880, 30); },
    ladder: function () { melody([[523, 70], [659, 70], [784, 70], [1047, 120]]); },
    snake: function () { melody([[784, 80], [622, 80], [523, 80], [392, 160]]); },
    bounce: function () { melody([[300, 80], [250, 120]]); },
    win: function () { melody([[659, 120], [587, 120], [370, 200], [415, 200], [554, 120], [494, 120], [294, 200], [330, 200], [494, 120], [440, 120], [277, 200], [330, 200], [440, 400]]); },
  };

  // ---------- drawing primitives ----------
  function px(x, y) { ctx.fillRect(x | 0, y | 0, 1, 1); }
  function rect(x, y, w, h) { ctx.fillRect(x, y, w, h); }
  function clearRect(x, y, w, h) {
    ctx.fillStyle = LCD_BG;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = LCD_FG;
  }
  function frame(x, y, w, h) {
    rect(x, y, w, 1); rect(x, y + h - 1, w, 1);
    rect(x, y, 1, h); rect(x + w - 1, y, 1, h);
  }
  function text(s, x, y) { return Font.drawText(px, s, x, y); }
  function textInverted(s, x, y) {
    ctx.fillStyle = LCD_BG;
    Font.drawText(px, s, x, y);
    ctx.fillStyle = LCD_FG;
  }
  function centerText(s, y, x0, w) {
    const left = x0 === undefined ? 0 : x0;
    const width = w === undefined ? W : w;
    text(s, left + Math.floor((width - Font.textWidth(s)) / 2), y);
  }
  function line(x0, y0, x1, y1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      px(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function cellCenter(square) {
    const c = SL.squareToCell(square);
    return { x: BX + c.col * CELL + 4, y: BY + c.row * CELL + 4 };
  }

  function drawLadder(from, to) {
    const a = cellCenter(from), b = cellCenter(to);
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len, ny = dx / len;
    const o = 1.2;
    line(a.x + nx * o, a.y + ny * o, b.x + nx * o, b.y + ny * o);
    line(a.x - nx * o, a.y - ny * o, b.x - nx * o, b.y - ny * o);
    for (let d = 2; d < len - 1; d += 3) {
      const t = d / len;
      const cx = a.x + dx * t, cy = a.y + dy * t;
      px(Math.round(cx + nx * 0.4), Math.round(cy + ny * 0.4));
      px(Math.round(cx - nx * 0.4), Math.round(cy - ny * 0.4));
    }
  }

  function drawSnake(head, tail) {
    const a = cellCenter(head), b = cellCenter(tail);
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len, ny = dx / len;
    const steps = Math.ceil(len * 1.5);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const w = Math.sin(t * Math.PI * Math.max(2, Math.round(len / 6))) * 1.5;
      px(Math.round(a.x + dx * t + nx * w), Math.round(a.y + dy * t + ny * w));
    }
    rect(a.x - 1, a.y - 1, 3, 2); // head
    clearRect(a.x, a.y - 1, 1, 1); // eye
  }

  function drawBoard() {
    frame(BX, BY, CELL * 10 + 1, CELL * 10 + 1);
    // grid dots at intersections
    for (let r = 1; r < 10; r++) {
      for (let c = 1; c < 10; c++) px(BX + c * CELL, BY + r * CELL);
    }
    // finish flag on 100
    const f = SL.squareToCell(100);
    const fx = BX + f.col * CELL, fy = BY + f.row * CELL;
    rect(fx + 3, fy + 2, 1, 6); rect(fx + 4, fy + 2, 3, 3);
    Object.keys(SL.LADDERS).forEach(function (k) { drawLadder(+k, SL.LADDERS[k]); });
    Object.keys(SL.SNAKES).forEach(function (k) { drawSnake(+k, SL.SNAKES[k]); });
  }

  function drawToken(i, x, y) {
    // x,y = top-left of a 3x3 token
    if (i === 0) {
      rect(x, y, 3, 3);
    } else {
      frame(x, y, 3, 3);
    }
  }

  function tokenOffset(i) { return i === 0 ? { x: -3, y: -3 } : { x: 1, y: 1 }; }

  function drawDie(value, x, y) {
    clearRect(x, y, 15, 15);
    frame(x, y, 15, 15);
    clearRect(x, y, 1, 1); clearRect(x + 14, y, 1, 1);
    clearRect(x, y + 14, 1, 1); clearRect(x + 14, y + 14, 1, 1);
    if (!value) { text('?', x + 6, y + 5); return; }
    const L = 3, M = 6, R = 9;
    const pips = {
      1: [[M, M]],
      2: [[L, L], [R, R]],
      3: [[L, L], [M, M], [R, R]],
      4: [[L, L], [R, L], [L, R], [R, R]],
      5: [[L, L], [R, L], [M, M], [L, R], [R, R]],
      6: [[L, L], [R, L], [L, M], [R, M], [L, R], [R, R]],
    }[value];
    pips.forEach(function (p) { rect(x + p[0], y + p[1], 3, 3); });
  }

  function softkey(label) {
    rect(0, H - 7, W, 7);
    const s = String(label).toUpperCase();
    textInverted(s, Math.floor((W - Font.textWidth(s)) / 2), H - 6);
  }

  // ---------- game/app state ----------
  const app = {
    screen: 'menu',
    menuIndex: 0,
    mode: 1, // 1 = vs CPU, 2 = two players
    game: null,
    display: [], // per player: {square, x, y} (x,y used during slides)
    die: 0,
    msg: ['', ''],
    busy: false,
    session: 0, // bumped whenever a game starts/ends so stale animations stop
    blink: true,
    turns: 0,
  };

  function menuItems() {
    return ['1 PLAYER', '2 PLAYERS', 'SOUND:' + (soundOn ? 'ON' : 'OFF')];
  }

  function newGame(mode) {
    app.mode = mode;
    app.game = SL.createGame(mode === 1 ? ['YOU', 'CPU'] : ['P1', 'P2']);
    app.display = app.game.players.map(function () { return { square: 0, x: null, y: null }; });
    app.die = 0;
    app.turns = 0;
    app.msg = [currentName() + ' GO', ''];
    app.busy = false;
    app.session++;
    app.screen = 'play';
  }

  function currentName() { return app.game.players[app.game.current].name; }
  function isCpuTurn() { return app.mode === 1 && app.game.current === 1 && app.game.winner === null; }

  // ---------- render ----------
  function render() {
    ctx.fillStyle = LCD_BG;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = LCD_FG;
    if (app.screen === 'menu') renderMenu();
    else if (app.screen === 'play') renderPlay();
    else if (app.screen === 'over') renderOver();
  }

  function renderMenu() {
    centerText('SNAKES', 6);
    centerText('& LADDERS', 14);
    // little pixel snake & ladder decorations
    drawMiniLadder(8, 4); drawMiniLadder(W - 13, 4);
    const items = menuItems();
    items.forEach(function (it, i) {
      const y = 30 + i * 11;
      if (i === app.menuIndex) {
        rect(16, y - 3, W - 32, 11);
        textInverted(it, Math.floor((W - Font.textWidth(it)) / 2), y);
      } else {
        centerText(it, y);
      }
    });
    softkey('SELECT');
  }

  function drawMiniLadder(x, y) {
    rect(x, y, 1, 13); rect(x + 4, y, 1, 13);
    for (let k = 1; k < 13; k += 3) rect(x, y + k, 5, 1);
  }

  function renderPlay() {
    drawBoard();
    const g = app.game;
    // tokens: clear all backgrounds first so tokens sharing a square stay visible
    const tokens = [];
    app.display.forEach(function (d, i) {
      if (d.square < 1 && d.x === null) return;
      if (!app.busy && i === g.current && !app.blink && g.winner === null) return;
      const c = d.x !== null ? { x: d.x, y: d.y } : cellCenter(d.square);
      const o = tokenOffset(i);
      tokens.push({ i: i, x: Math.round(c.x + o.x), y: Math.round(c.y + o.y) });
    });
    tokens.forEach(function (t) { clearRect(t.x - 1, t.y - 1, 5, 5); });
    tokens.forEach(function (t) { drawToken(t.i, t.x, t.y); });
    // side panel
    g.players.forEach(function (p, i) {
      const y = 3 + i * 8;
      if (i === g.current && g.winner === null) text('>', PANEL_X, y);
      if (i === 0) rect(PANEL_X + 4, y + 1, 3, 3); else frame(PANEL_X + 4, y + 1, 3, 3);
      text(p.name, PANEL_X + 9, y);
      const pos = String(app.display[i].square);
      text(pos, W - 1 - Font.textWidth(pos), y);
    });
    drawDie(app.die, PANEL_X + Math.floor((W - PANEL_X - 15) / 2), 22);
    centerText(app.msg[0], 45, PANEL_X - 1, W - PANEL_X + 1);
    centerText(app.msg[1], 53, PANEL_X - 1, W - PANEL_X + 1);
    // softkey bar on the panel only, so the board stays visible
    rect(PANEL_X - 1, H - 8, W - PANEL_X + 1, 8);
    const label = app.busy ? '...' : (isCpuTurn() ? 'WAIT' : '5:ROLL');
    textInverted(label, PANEL_X - 1 + Math.floor((W - PANEL_X + 1 - Font.textWidth(label)) / 2), H - 6);
  }

  function renderOver() {
    const g = app.game;
    const name = g.players[g.winner].name;
    centerText('GAME OVER', 8);
    frame(16, 18, W - 32, 26);
    const line1 = name === 'YOU' ? 'YOU WIN!' : name + ' WINS!';
    centerText(line1, 23);
    centerText('ROLLS: ' + app.turns, 33);
    centerText('OK = AGAIN', 52);
    centerText('C = MENU', 62);
    softkey('AGAIN');
  }

  // ---------- animation helpers ----------
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function animateRoll(final) {
    for (let i = 0; i < 8; i++) {
      app.die = 1 + Math.floor(Math.random() * 6);
      SFX.key();
      render();
      await wait(60 + i * 10);
    }
    app.die = final;
    render();
    await wait(200);
  }

  async function animateSteps(i, from, to) {
    const d = app.display[i];
    for (let s = from + 1; s <= to; s++) {
      d.square = s;
      SFX.step();
      render();
      await wait(140);
    }
  }

  async function animateSlide(i, from, to) {
    const d = app.display[i];
    const a = cellCenter(from), b = cellCenter(to);
    const frames = 18;
    for (let f = 1; f <= frames; f++) {
      const t = f / frames;
      d.x = a.x + (b.x - a.x) * t;
      d.y = a.y + (b.y - a.y) * t;
      render();
      await wait(30);
    }
    d.x = null; d.y = null; d.square = to;
    render();
  }

  async function takeTurn() {
    if (app.busy || app.screen !== 'play' || app.game.winner !== null) return;
    app.busy = true;
    const session = app.session;
    const alive = function () { return app.session === session; };
    const roll = SL.rollDie();
    const playerIdx = app.game.current;
    const result = SL.applyRoll(app.game, roll);
    const move = result.move;
    app.turns++;
    app.msg = [app.game.players[playerIdx].name + ' ROLLS', ''];
    await animateRoll(roll);
    if (!alive()) return;

    if (move.kind === 'bounce') {
      app.msg = ['TOO HIGH', 'NEED ' + (SL.BOARD_SIZE - move.from)];
      SFX.bounce();
      render();
      await wait(700);
      if (!alive()) return;
    } else {
      await animateSteps(playerIdx, move.from, move.landed);
      if (!alive()) return;
      if (move.landed !== move.to) {
        const up = move.to > move.landed;
        app.msg = up ? ['LADDER!', 'UP TO ' + move.to] : ['SNAKE!', 'DOWN ' + move.to];
        if (up) SFX.ladder(); else SFX.snake();
        render();
        await wait(350);
        if (!alive()) return;
        await animateSlide(playerIdx, move.landed, move.to);
        if (!alive()) return;
        await wait(250);
        if (!alive()) return;
      }
    }

    app.game = result.state;
    app.busy = false;

    if (app.game.winner !== null) {
      app.msg = ['WINNER!', ''];
      render();
      SFX.win();
      await wait(1200);
      if (!alive()) return;
      app.screen = 'over';
      render();
      return;
    }

    if (move.extraTurn) app.msg = ['SIX!', currentName() + ' AGAIN'];
    else if (move.kind !== 'ladder' && move.kind !== 'snake' && move.kind !== 'bounce') app.msg = [currentName() + ' GO', ''];
    else app.msg[1] = currentName() + ' NEXT';
    render();

    if (isCpuTurn()) {
      await wait(800);
      if (!alive()) return;
      takeTurn();
    }
  }

  // ---------- input ----------
  function setSound(on) {
    soundOn = on;
    try { localStorage.setItem('sl-sound', on ? 'on' : 'off'); } catch (e) { /* ignore */ }
  }

  function handleKey(key) {
    SFX.key();
    if (app.screen === 'menu') {
      const n = menuItems().length;
      if (key === 'up') app.menuIndex = (app.menuIndex + n - 1) % n;
      else if (key === 'down') app.menuIndex = (app.menuIndex + 1) % n;
      else if (key === '1') newGame(1);
      else if (key === '2') newGame(2);
      else if (key === 'ok') {
        if (app.menuIndex === 0) newGame(1);
        else if (app.menuIndex === 1) newGame(2);
        else setSound(!soundOn);
      }
    } else if (app.screen === 'play') {
      if (key === 'back') { app.screen = 'menu'; app.busy = false; app.session++; }
      else if ((key === 'ok' || key === '5') && !isCpuTurn()) takeTurn();
    } else if (app.screen === 'over') {
      if (key === 'ok' || key === '5') newGame(app.mode);
      else if (key === 'back') app.screen = 'menu';
    }
    render();
  }

  // Map a physical/virtual key name to an action for the current screen.
  function translate(raw) {
    if (raw === 'Enter' || raw === ' ' || raw === 'ok') return 'ok';
    if (raw === 'Escape' || raw === 'Backspace' || raw === 'c' || raw === 'C' || raw === 'back') return 'back';
    if (raw === 'ArrowUp' || raw === 'up') return 'up';
    if (raw === 'ArrowDown' || raw === 'down') return 'down';
    if (raw === '1') return '1';
    if (raw === '5') return '5';
    if (raw === '2') return app.screen === 'menu' ? '2' : 'up';
    if (raw === '8') return 'down';
    return null;
  }

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = translate(e.key);
    if (!key) return;
    e.preventDefault();
    handleKey(key);
  });

  document.querySelectorAll('[data-key]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const key = translate(btn.getAttribute('data-key'));
      if (key) handleKey(key);
    });
  });

  // ---------- blink loop ----------
  setInterval(function () {
    app.blink = !app.blink;
    if (app.screen === 'play' && !app.busy) render();
  }, 450);

  render();
})();
