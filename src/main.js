import { LADDERS, SNAKES, BOARD_SIZE, rollDie, move, squareToCell, createGame, playTurn } from './game.js';

const INK = '#1f2b17';
const BG = '#a7c48a';
const CELL = 8; // pixels per square; grid lines on multiples of 8 → 81px canvas

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);

let state = { screen: 'title', mode: 'cpu', game: null, busy: false, blink: true, dice: null };
let soundOn = true;
let audio = null;

// ---------- sound: monophonic square-wave beeps, like the original handsets ----------
function beep(freq, ms = 60, when = 0) {
  if (!soundOn) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime + when / 1000;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.setValueAtTime(0, t + ms / 1000);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.02);
  } catch { /* audio unavailable */ }
}
const tune = (notes) => notes.forEach(([f, d], i, a) => beep(f, d, a.slice(0, i).reduce((s, n) => s + n[1] + 20, 0)));

// ---------- pixel drawing ----------
const px = (x, y) => ctx.fillRect(x | 0, y | 0, 1, 1);
function line(x0, y0, x1, y1) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
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
const center = (sq) => { const { col, row } = squareToCell(sq); return [col * CELL + 4, row * CELL + 4]; };

function drawLadder(a, b) {
  const [x0, y0] = center(a), [x1, y1] = center(b);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len * 1.5, ny = (x1 - x0) / len * 1.5;
  line(x0 + nx, y0 + ny, x1 + nx, y1 + ny);
  line(x0 - nx, y0 - ny, x1 - nx, y1 - ny);
  for (let t = 4; t < len - 2; t += 4) {
    const cx = x0 + (x1 - x0) * t / len, cy = y0 + (y1 - y0) * t / len;
    line(cx + nx, cy + ny, cx - nx, cy - ny);
  }
}

function drawSnake(a, b) {
  const [x0, y0] = center(a), [x1, y1] = center(b);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  let prev = null;
  for (let t = 0; t <= len; t += 1) {
    const w = Math.sin(t / 3) * 2;
    const p = [x0 + (x1 - x0) * t / len + nx * w, y0 + (y1 - y0) * t / len + ny * w];
    if (prev) line(prev[0], prev[1], p[0], p[1]);
    prev = p;
  }
  ctx.fillRect(x0 - 1, y0 - 1, 3, 3); // head
}

function drawToken(sq, idx) {
  if (sq < 1) return;
  const { col, row } = squareToCell(sq);
  const x = col * CELL + (idx === 0 ? 1 : 4), y = row * CELL + (idx === 0 ? 1 : 4);
  ctx.fillStyle = BG;
  ctx.fillRect(x - 1, y - 1, 5, 5);
  ctx.fillStyle = INK;
  if (idx === 0) ctx.fillRect(x, y, 3, 3);
  else { ctx.fillRect(x, y, 3, 1); ctx.fillRect(x, y + 2, 3, 1); px(x, y + 1); px(x + 2, y + 1); }
}

function drawDice(n) {
  const x = 30, y = 30;
  ctx.fillStyle = BG; ctx.fillRect(x - 2, y - 2, 25, 25);
  ctx.fillStyle = INK; ctx.fillRect(x, y, 21, 21);
  ctx.fillStyle = BG; ctx.fillRect(x + 1, y + 1, 19, 19);
  ctx.fillStyle = INK;
  const pips = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] }[n];
  for (const [c, r] of pips) ctx.fillRect(x + 3 + c * 6, y + 3 + r * 6, 3, 3);
}

function drawTitle() {
  ctx.fillStyle = BG; ctx.fillRect(0, 0, 81, 81);
  ctx.fillStyle = INK;
  drawLadder(2, 99);
  drawSnake(95, 6);
}

function render() {
  if (state.screen === 'title') return drawTitle();
  const g = state.game;
  ctx.fillStyle = BG; ctx.fillRect(0, 0, 81, 81);
  ctx.fillStyle = INK;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 80; j += 2) { px(i * CELL, j); px(j, i * CELL); }
  ctx.fillRect(0, 0, CELL + 1, 1); // mark the finish square 100 with a flag-ish top bar
  ctx.fillRect(1, 1, 2, 4);
  for (const [a, b] of Object.entries(LADDERS)) drawLadder(+a, b);
  for (const [a, b] of Object.entries(SNAKES)) drawSnake(+a, b);
  g.players.forEach((p, i) => { if (state.blink || i !== g.turn || state.busy) drawToken(p.pos, i); });
  if (state.dice) drawDice(state.dice);
  $('top-left').textContent = `■${g.players[0].name} ${g.players[0].pos}`;
  $('top-right').textContent = `□${g.players[1].name} ${g.players[1].pos}`;
}

const msg = (t) => { $('msg').textContent = t; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- game flow ----------
function newGame(mode = state.mode) {
  state.mode = mode;
  state.game = createGame(mode === 'cpu' ? ['YOU', 'CPU'] : ['P1', 'P2']);
  state.screen = 'game';
  state.dice = null;
  state.busy = false;
  tune([[660, 60], [880, 60], [1320, 120]]);
  $('soft-left').textContent = 'New';
  $('soft-right').textContent = 'Roll';
  msg(`${state.game.players[0].name}: PRESS 5`);
  render();
}

async function takeTurn() {
  const g = state.game;
  if (state.busy || g.winner !== null) return;
  state.busy = true;
  const player = g.players[g.turn];

  for (let i = 0; i < 6; i++) { state.dice = rollDie(); render(); beep(400 + i * 60, 30); await sleep(70); }
  const roll = rollDie();
  state.dice = roll; render(); beep(1000, 80);
  msg(`${player.name} ROLLED ${roll}`);
  await sleep(450);
  state.dice = null;

  const result = move(player.pos, roll);
  if (result.event === 'bounce') {
    msg(`${player.name} ROLLED ${roll}\nNEED EXACT ${BOARD_SIZE - player.pos}`);
    beep(200, 150);
  } else {
    for (let s = player.pos + 1; s <= result.landed; s++) { player.pos = s; render(); beep(880, 25); await sleep(140); }
    if (result.event === 'ladder') {
      msg(`${player.name} ROLLED ${roll}\nLADDER! ${result.landed}→${result.to}`);
      tune([[523, 50], [659, 50], [784, 50], [1047, 90]]);
    } else if (result.event === 'snake') {
      msg(`${player.name} ROLLED ${roll}\nSNAKE! ${result.landed}→${result.to}`);
      tune([[784, 60], [622, 60], [523, 60], [392, 120]]);
    }
    if (result.event === 'ladder' || result.event === 'snake') { await sleep(350); player.pos = result.to; render(); }
  }

  // Animation done — apply the authoritative rules (exact 100 wins, a six grants another roll).
  const current = g.turn;
  player.pos = result.from;
  playTurn(g, roll);
  if (g.winner !== null) {
    state.busy = false;
    render();
    msg(`${player.name} WIN${player.name === 'YOU' ? '' : 'S'}!\n* NEW GAME`);
    tune([[523, 100], [659, 100], [784, 100], [1047, 250], [784, 100], [1047, 300]]);
    return;
  }
  const extra = g.turn === current;
  await sleep(400);
  const next = g.players[g.turn];
  const isCpu = state.mode === 'cpu' && g.turn === 1;
  msg(`${extra ? 'SIX! ROLL AGAIN\n' : ''}${next.name}: ${isCpu ? 'THINKING...' : 'PRESS 5'}`);
  state.busy = false;
  render();
  if (isCpu) { await sleep(700); if (state.game === g) takeTurn(); }
}

function showTitle() {
  state.screen = 'title';
  state.game = null;
  $('top-left').textContent = 'NOKIA';
  $('top-right').textContent = '▮▮▮▯';
  $('soft-left').textContent = '1:CPU';
  $('soft-right').textContent = '2:2P';
  msg('SNAKES & LADDERS\nPRESS 1 OR 2');
  render();
}

function handleKey(key) {
  const btn = document.querySelector(`button[data-key="${CSS.escape(key)}"]`);
  if (btn) { btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 100); }
  if (key === '#' || key === 'sound') { soundOn = !soundOn; msg(soundOn ? 'SOUND ON' : 'SOUND OFF'); beep(1200, 40); return; }
  beep(1400, 15);
  if (state.screen === 'title') {
    if (key === '1' || key === 'ok' || key === '5') newGame('cpu');
    else if (key === '2') newGame('2p');
    return;
  }
  if (state.busy) return; // ignore input while dice/tokens animate
  if (key === '*' || key === 'menu') return state.game.winner !== null ? showTitle() : newGame();
  if (key === '1' || key === '2') return newGame(key === '1' ? 'cpu' : '2p');
  if (key === '5' || key === 'ok') {
    const g = state.game;
    if (g.winner !== null) return newGame();
    if (state.mode === 'cpu' && g.turn === 1) return; // CPU's turn
    takeTurn();
  }
}

document.querySelectorAll('button[data-key]').forEach((b) => b.addEventListener('click', () => handleKey(b.dataset.key)));
window.addEventListener('keydown', (e) => {
  const map = { ' ': 'ok', Enter: 'ok', Escape: 'menu', ArrowUp: 'ok' };
  const key = map[e.key] ?? e.key;
  if (['ok', 'menu', '#', '*', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) { e.preventDefault(); handleKey(key); }
});
setInterval(() => { state.blink = !state.blink; if (state.screen === 'game' && !state.busy) render(); }, 400);

showTitle();
