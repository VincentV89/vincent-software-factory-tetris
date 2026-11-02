// Nokia-style Snakes & Ladders — renders to an 84x48 monochrome "LCD".
import {
  LADDERS,
  SNAKES,
  FINAL_SQUARE,
  squareToCell,
  rollDie,
  createGame,
  computeMove,
  playTurn,
} from './logic.js';

const W = 84;
const H = 48;
const INK = '#43523d';
const BG = '#c7f0d8';

// 3x5 pixel font. Each glyph is 15 bits, row-major, top to bottom.
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  ' ': '000000000000000', '!': '010010010000010', '?': '110001010000010', '.': '000000000000010',
  ':': '000010000010000', '-': '000000111000000', '>': '100010001010100', '<': '001010100010001',
  '&': '010101010101011', '/': '001001010100100', '+': '000010111010000',
};

// ---------------------------------------------------------------- rendering
const canvas = document.getElementById('lcd');
const ctx = canvas.getContext('2d');

function clear() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = INK;
}
function px(x, y, on = true) {
  ctx.fillStyle = on ? INK : BG;
  ctx.fillRect(x, y, 1, 1);
}
function rect(x, y, w, h, on = true) {
  ctx.fillStyle = on ? INK : BG;
  ctx.fillRect(x, y, w, h);
}
function frame(x, y, w, h) {
  rect(x, y, w, 1);
  rect(x, y + h - 1, w, 1);
  rect(x, y, 1, h);
  rect(x + w - 1, y, 1, h);
}
function textWidth(str, scale = 1) {
  return str.length ? (str.length * 4 - 1) * scale : 0;
}
function text(str, x, y, { scale = 1, on = true } = {}) {
  ctx.fillStyle = on ? INK : BG;
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const g = FONT[ch] || FONT['?'];
    for (let i = 0; i < 15; i++) {
      if (g[i] === '1') ctx.fillRect(cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
    }
    cx += 4 * scale;
  }
}
function centered(str, y, opts = {}) {
  text(str, Math.floor((W - textWidth(str, opts.scale || 1)) / 2), y, opts);
}
function line(x0, y0, x1, y1, pattern = null) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, n = 0;
  for (;;) {
    if (!pattern || pattern(n)) px(x0, y0);
    n++;
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// Board geometry: 10x10 cells of 4px (3px interior + 1px gutter) at (BX, BY).
const BX = 1;
const BY = 3;
function cellOrigin(square) {
  const { row, col } = squareToCell(square);
  return { x: BX + col * 4 + 1, y: BY + (9 - row) * 4 + 1 };
}
function cellCenter(square) {
  const o = cellOrigin(square);
  return { x: o.x + 1, y: o.y + 1 };
}

function drawBoard() {
  frame(BX, BY, 41, 41);
  for (let r = 1; r < 10; r++) {
    for (let c = 1; c < 10; c++) px(BX + c * 4, BY + r * 4);
  }
  // Finish square gets a little flag pattern.
  const f = cellOrigin(FINAL_SQUARE);
  px(f.x, f.y); px(f.x + 2, f.y); px(f.x + 1, f.y + 1); px(f.x, f.y + 2); px(f.x + 2, f.y + 2);

  for (const [from, to] of Object.entries(LADDERS)) {
    const a = cellCenter(Number(from));
    const b = cellCenter(to);
    line(a.x - 1, a.y, b.x - 1, b.y);
    line(a.x + 1, a.y, b.x + 1, b.y);
  }
  for (const [from, to] of Object.entries(SNAKES)) {
    const a = cellCenter(Number(from));
    const b = cellCenter(to);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const steps = Math.ceil(len);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wig = Math.sin(t * Math.PI * 4) * 1.2 * (1 - t * 0.5);
      px(Math.round(a.x + (b.x - a.x) * t + nx * wig), Math.round(a.y + (b.y - a.y) * t + ny * wig));
    }
    rect(a.x - 1, a.y - 1, 2, 2); // head
  }
}

function drawToken(index, x, y) {
  rect(x, y, 3, 3, false);
  if (index === 0) {
    rect(x, y, 3, 3);
  } else {
    frame(x, y, 3, 3);
  }
}

function drawDie(value, x, y) {
  rect(x, y, 13, 13, false);
  frame(x, y, 13, 13);
  const P = { l: 2, m: 5, r: 9 };
  const pip = (cx, cy) => rect(x + P[cx], y + P[cy], 2, 2);
  const layouts = {
    1: [['m', 'm']],
    2: [['l', 'l'], ['r', 'r']],
    3: [['l', 'l'], ['m', 'm'], ['r', 'r']],
    4: [['l', 'l'], ['r', 'l'], ['l', 'r'], ['r', 'r']],
    5: [['l', 'l'], ['r', 'l'], ['m', 'm'], ['l', 'r'], ['r', 'r']],
    6: [['l', 'l'], ['r', 'l'], ['l', 'm'], ['r', 'm'], ['l', 'r'], ['r', 'r']],
  };
  for (const [cx, cy] of layouts[value] || []) pip(cx, cy);
  if (!value) text('?', x + 5, y + 4);
}

// ---------------------------------------------------------------- sound
const sound = {
  enabled: true,
  ctx: null,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, ms, when = 0, vol = 0.06) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.setValueAtTime(0, t + ms / 1000);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.02);
  },
  seq(notes, unit) {
    let t = 0;
    for (const [f, len] of notes) {
      if (f) this.tone(f, len * unit * 0.9, t / 1000);
      t += len * unit;
    }
  },
  click() { this.tone(1400, 25); },
  tick() { this.tone(900, 18); },
  step() { this.tone(620, 35); },
  ladder() { this.seq([[523, 1], [659, 1], [784, 1], [1047, 2]], 70); },
  snake() { this.seq([[784, 1], [622, 1], [494, 1], [392, 1], [262, 3]], 70); },
  bump() { this.seq([[220, 1], [196, 2]], 80); },
  // The classic Nokia tune (Gran Vals) for the winner.
  win() {
    this.seq([
      [659, 1], [587, 1], [370, 2], [415, 2], [554, 1], [494, 1], [294, 2], [330, 2],
      [494, 1], [440, 1], [277, 2], [330, 2], [440, 4],
    ], 120);
  },
};

// ---------------------------------------------------------------- state
const NAMES = { 1: ['P1', 'CPU'], 2: ['P1', 'P2'] };
const MENU = ['1 PLAYER', '2 PLAYERS', 'SOUND'];

const app = {
  scene: 'title',
  menuIndex: 0,
  mode: 1,
  game: null,
  die: 0,
  phase: 'idle', // idle | busy
  message: '',
  tokens: [], // per-player draw override {x, y} during slides
  session: 0, // bumps whenever a game is abandoned so pending animations stop
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function isCpuTurn() {
  return app.mode === 1 && app.game && app.game.current === 1 && app.game.winner === null;
}

function startGame(mode) {
  app.session++;
  app.mode = mode;
  app.game = createGame(NAMES[mode]);
  app.die = 0;
  app.phase = 'idle';
  app.tokens = [];
  app.message = 'P1 ROLL';
  app.scene = 'play';
}

async function takeTurn() {
  if (app.phase !== 'idle' || !app.game || app.game.winner !== null) return;
  const session = app.session;
  const alive = () => session === app.session;
  app.phase = 'busy';
  const who = app.game.current;
  const name = app.game.players[who].name;
  app.message = '';

  // Dice shuffle.
  for (let i = 0; i < 9; i++) {
    app.die = rollDie();
    sound.tick();
    await wait(45 + i * 8);
    if (!alive()) return;
  }
  const roll = rollDie();
  app.die = roll;
  sound.click();
  await wait(250);
  if (!alive()) return;

  const startPos = app.game.players[who].position;
  const move = computeMove(startPos, roll);
  const displayed = app.game.players.map((p) => p.position);

  if (move.bounced) {
    app.message = `NEED ${FINAL_SQUARE - startPos}`;
    sound.bump();
    await wait(800);
    if (!alive()) return;
  } else {
    for (const sq of move.steps) {
      displayed[who] = sq;
      app.shown = displayed.slice();
      sound.step();
      await wait(170);
      if (!alive()) return;
    }
    if (move.via) {
      app.message = move.via === 'ladder' ? 'LADDER!' : 'SNAKE!';
      move.via === 'ladder' ? sound.ladder() : sound.snake();
      await wait(250);
      const a = cellOrigin(move.landed);
      const b = cellOrigin(move.to);
      const frames = 14;
      for (let f = 1; f <= frames; f++) {
        app.tokens[who] = { x: a.x + ((b.x - a.x) * f) / frames, y: a.y + ((b.y - a.y) * f) / frames };
        await wait(40);
        if (!alive()) return;
      }
      displayed[who] = move.to;
      app.shown = displayed.slice();
      app.tokens[who] = null;
      await wait(300);
      if (!alive()) return;
    }
  }

  app.game = playTurn(app.game, roll);
  app.shown = null;
  if (app.game.winner !== null) {
    app.message = `${name} WINS!`;
    await wait(500);
    if (!alive()) return;
    app.scene = 'win';
    app.phase = 'idle';
    sound.win();
    return;
  }

  const next = app.game.players[app.game.current].name;
  app.message = `${next} ROLL`;
  app.phase = 'idle';
  if (isCpuTurn()) {
    await wait(700);
    if (!alive()) return;
    takeTurn();
  }
}

// ---------------------------------------------------------------- scenes
let blink = true;
setInterval(() => { blink = !blink; }, 400);

function renderTitle() {
  centered('SNAKES', 2, { scale: 2 });
  centered('&', 13);
  centered('LADDERS', 19, { scale: 2 });
  // Little snake doodle.
  for (let x = 4; x < 80; x++) {
    px(x, 33 + Math.round(Math.sin(x / 3) * 1.5));
  }
  rect(79, 32, 3, 3);
  if (blink) centered('PRESS 5', 40);
}

function renderMenu() {
  rect(0, 0, W, 8);
  centered('MENU', 1, { on: false });
  MENU.forEach((label, i) => {
    const y = 11 + i * 9;
    const str = label === 'SOUND' ? `SOUND: ${sound.enabled ? 'ON' : 'OFF'}` : label;
    if (i === app.menuIndex) {
      rect(2, y - 1, W - 8, 7);
      text(str, 4, y, { on: false });
    } else {
      text(str, 4, y);
    }
  });
  // Scrollbar, Nokia style.
  rect(W - 3, 9, 1, 38);
  rect(W - 4, 10 + app.menuIndex * 12, 3, 10);
}

function renderPlay() {
  drawBoard();
  const g = app.game;
  const positions = app.shown || g.players.map((p) => p.position);

  // Tokens: current player's token blinks while waiting for a roll.
  g.players.forEach((_, i) => {
    const override = app.tokens[i];
    if (override) {
      drawToken(i, Math.round(override.x), Math.round(override.y));
      return;
    }
    const pos = positions[i];
    if (pos < 1) return;
    const sameSquare = positions[1 - i] === pos;
    const hidden =
      (app.phase === 'idle' && i === g.current && !blink) ||
      (sameSquare && app.phase !== 'idle' && blink === (i === 0));
    if (hidden) return;
    const o = cellOrigin(pos);
    drawToken(i, o.x, o.y);
  });

  // Side panel.
  const PX = 44;
  g.players.forEach((p, i) => {
    const y = 3 + i * 7;
    if (i === g.current) text('>', PX, y);
    drawToken(i, PX + 4, y + 1);
    text(p.name, PX + 9, y);
    const num = String(positions[i]);
    text(num, W - textWidth(num), y);
  });
  rect(PX, 17, W - PX, 1);
  drawDie(app.die, PX, 20);
  if (app.phase === 'idle') {
    if (isCpuTurn()) {
      text('CPU', PX + 16, 22);
      text('...', PX + 16, 28);
    } else {
      text('ROLL', PX + 16, 22);
      if (blink) text('5', PX + 16, 28);
    }
  }
  if (app.message) text(app.message.slice(0, 10), PX, 38);
}

function renderWin() {
  const name = app.game.players[app.game.winner].name;
  if (blink) frame(0, 0, W, H);
  centered(name, 5, { scale: 2 });
  centered('WINS!', 17, { scale: 2 });
  centered(`${app.game.players.map((p) => p.position).join(' - ')}`, 30);
  centered('5 PLAY AGAIN', 40);
}

function render() {
  clear();
  if (app.scene === 'title') renderTitle();
  else if (app.scene === 'menu') renderMenu();
  else if (app.scene === 'play') renderPlay();
  else if (app.scene === 'win') renderWin();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

// ---------------------------------------------------------------- input
function press(key) {
  sound.ensure();
  if (key === 'mute') {
    sound.enabled = !sound.enabled;
    sound.click();
    return;
  }
  sound.click();
  switch (app.scene) {
    case 'title':
      if (key === 'ok' || key === '5') app.scene = 'menu';
      break;
    case 'menu':
      if (key === 'up' || key === '2') app.menuIndex = (app.menuIndex + MENU.length - 1) % MENU.length;
      else if (key === 'down' || key === '8') app.menuIndex = (app.menuIndex + 1) % MENU.length;
      else if (key === 'back') app.scene = 'title';
      else if (key === 'ok' || key === '5') {
        if (MENU[app.menuIndex] === 'SOUND') sound.enabled = !sound.enabled;
        else startGame(app.menuIndex + 1);
      } else if (key === '1') startGame(1);
      break;
    case 'play':
      if (key === 'back') {
        app.session++;
        app.scene = 'menu';
      } else if ((key === 'ok' || key === '5') && !isCpuTurn()) {
        takeTurn();
      }
      break;
    case 'win':
      if (key === 'ok' || key === '5') startGame(app.mode);
      else if (key === 'back') app.scene = 'menu';
      break;
    default:
      break;
  }
}

const KEYMAP = {
  Enter: 'ok', ' ': 'ok', 5: '5', ArrowUp: 'up', ArrowDown: 'down', 2: '2', 8: '8', 1: '1',
  Escape: 'back', Backspace: 'back', m: 'mute', M: 'mute', '*': 'mute',
};

window.addEventListener('keydown', (e) => {
  const key = KEYMAP[e.key];
  if (!key) return;
  e.preventDefault();
  if (e.repeat) return;
  press(key);
});

document.querySelectorAll('[data-key]').forEach((btn) => {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    press(btn.dataset.key);
  });
});
