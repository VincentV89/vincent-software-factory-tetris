import { COLS, GOAL, LADDERS, SNAKES, createGame, playTurn, rollDie, squareToCell } from "./game.js";

const CELL = 12;
const INK = "#1e2a10";
const BG = "#9bbc0f";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const softLeft = document.getElementById("soft-left");
const softRight = document.getElementById("soft-right");

// 3x5 pixel digits, rows top->bottom, 3 bits each.
const DIGITS = [
  [7, 5, 5, 5, 7], [2, 6, 2, 2, 7], [7, 1, 7, 4, 7], [7, 1, 7, 1, 7], [5, 5, 7, 1, 1],
  [7, 4, 7, 1, 7], [7, 4, 7, 5, 7], [7, 1, 1, 1, 1], [7, 5, 7, 5, 7], [7, 5, 7, 1, 7],
];

let mode = "menu"; // menu | play | anim | over
let game = null;
let display = []; // animated token positions
let soundOn = true;
let blink = true;
let audio = null;

const px = (x, y, w = 1, h = 1) => ctx.fillRect(Math.round(x), Math.round(y), w, h);

function drawDigits(n, x, y) {
  const s = String(n);
  for (const [i, ch] of [...s].entries()) {
    const rows = DIGITS[+ch];
    rows.forEach((bits, r) => {
      for (let c = 0; c < 3; c++) if (bits & (4 >> c)) px(x + i * 4 + c, y + r);
    });
  }
}

function center(square) {
  const { col, row } = squareToCell(square);
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

function line(x0, y0, x1, y1, dot = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) {
    px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, dot, dot);
  }
}

function drawLadder(a, b) {
  const p = center(a), q = center(b);
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
  const nx = (-dy / len) * 2, ny = (dx / len) * 2;
  line(p.x + nx, p.y + ny, q.x + nx, q.y + ny);
  line(p.x - nx, p.y - ny, q.x - nx, q.y - ny);
  for (let t = 3; t < len; t += 4) {
    const cx = p.x + (dx * t) / len, cy = p.y + (dy * t) / len;
    line(cx - nx, cy - ny, cx + nx, cy + ny);
  }
}

function drawSnake(head, tail) {
  const p = center(head), q = center(tail);
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const n = Math.ceil(len);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const w = Math.sin(t * Math.PI * Math.max(2, Math.round(len / 10))) * 2.5 * (1 - t * 0.6);
    px(p.x + dx * t + nx * w, p.y + dy * t + ny * w, 2, 2);
  }
  px(p.x - 2, p.y - 2, 4, 4); // head
  ctx.fillStyle = BG;
  px(p.x - 1, p.y - 1); px(p.x + 1, p.y - 1); // eyes
  ctx.fillStyle = INK;
}

function drawToken(i, square) {
  if (square < 1) return;
  const { col, row } = squareToCell(square);
  const x = col * CELL + (i === 0 ? 2 : 6), y = row * CELL + 6;
  ctx.fillStyle = INK;
  if (i === 0) {
    px(x - 1, y - 1, 6, 6); ctx.fillStyle = BG; px(x, y, 4, 4); ctx.fillStyle = INK; px(x + 1, y + 1, 2, 2);
  } else {
    px(x - 1, y - 1, 6, 6); ctx.fillStyle = BG; px(x, y, 4, 4); ctx.fillStyle = INK;
  }
}

function render() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = INK;
  for (let i = 0; i <= COLS; i++) {
    px(i * CELL, 0, 1, COLS * CELL + 1);
    px(0, i * CELL, COLS * CELL + 1, 1);
  }
  for (let s = 1; s <= GOAL; s++) {
    const { col, row } = squareToCell(s);
    if (s === GOAL) {
      // checkered finish square
      for (let y = 1; y < CELL; y += 2) for (let x = 1 + ((y >> 1) % 2); x < CELL; x += 2) px(col * CELL + x, row * CELL + y);
    } else {
      drawDigits(s, col * CELL + 2, row * CELL + 1);
    }
  }
  for (const [a, b] of Object.entries(LADDERS)) drawLadder(+a, b);
  for (const [a, b] of Object.entries(SNAKES)) drawSnake(+a, b);
  if (game) {
    display.forEach((sq, i) => {
      const waiting = mode === "play" && i === game.current && !game.players[i].cpu;
      if (!waiting || blink) drawToken(i, sq);
    });
  }
}

function beep(freq = 880, ms = 60) {
  if (!soundOn) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = "square"; o.frequency.value = freq; g.gain.value = 0.05;
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + ms / 1000);
  } catch { /* audio unavailable */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const name = (i) => game.players[i].name;
const where = () => game.players.map((p) => `${p.name}:${p.pos}`).join(" ");

function setStatus(text) { statusEl.textContent = text; }

function showMenu() {
  mode = "menu"; game = null; display = [];
  setStatus("SNAKES&LADDERS\n1:VS CPU  2:2 PLAYER");
  softLeft.textContent = "Menu";
  render();
}

function start(twoPlayer) {
  game = createGame([{ name: "P1" }, { name: twoPlayer ? "P2" : "CPU", cpu: !twoPlayer }]);
  display = game.players.map((p) => p.pos);
  mode = "play";
  softLeft.textContent = "Quit";
  beep(660, 80);
  prompt();
}

function prompt() {
  setStatus(`${name(game.current)} TURN - PRESS 5\n${where()}`);
  render();
  if (game.players[game.current].cpu) setTimeout(roll, 700);
}

async function roll() {
  if (mode !== "play") return;
  mode = "anim";
  const r = rollDie();
  const { state, result } = playTurn(game, r);
  const who = name(result.player);
  setStatus(`${who} ROLLED ${r}\n${where()}`);
  beep(440, 40);
  await sleep(250);
  for (const s of result.steps) {
    display[result.player] = s;
    render(); beep(1200, 20);
    await sleep(160);
  }
  if (result.event === "bounce") {
    setStatus(`${who} ROLLED ${r}\nNEED EXACT ${GOAL - result.from}!`);
    beep(200, 120); await sleep(800);
  } else if (result.jumpTo !== null) {
    const up = result.event.startsWith("ladder");
    setStatus(up ? `LADDER! UP TO ${result.jumpTo}` : `SNAKE! DOWN TO ${result.jumpTo}`);
    for (let k = 0; k < 4; k++) { beep(up ? 600 + k * 200 : 900 - k * 200, 50); await sleep(70); }
    display[result.player] = result.jumpTo;
    render(); await sleep(600);
  }
  game = state;
  if (game.winner !== null) {
    mode = "over";
    setStatus(`*** ${name(game.winner)} WINS! ***\nPRESS OK FOR MENU`);
    [523, 659, 784, 1047].forEach((f, k) => setTimeout(() => beep(f, 120), k * 150));
    render();
    return;
  }
  mode = "play";
  if (result.extraTurn) { setStatus(`ROLLED 6 - GO AGAIN!\n${where()}`); render(); await sleep(600); }
  prompt();
}

function press(key) {
  const el = document.querySelector(`.key[data-key="${CSS.escape(key)}"]`);
  if (el) { el.classList.add("pressed"); setTimeout(() => el.classList.remove("pressed"), 100); }
  beep(1000, 15);
  if (key === "right") { soundOn = !soundOn; softRight.textContent = soundOn ? "Sound" : "Mute"; return; }
  if (key === "left") { if (mode !== "anim") showMenu(); return; }
  if (mode === "menu") {
    if (key === "1") start(false);
    else if (key === "2") start(true);
  } else if (mode === "play") {
    if ((key === "5" || key === "ok") && !game.players[game.current].cpu) roll();
  } else if (mode === "over" && key === "ok") {
    showMenu();
  }
}

document.querySelectorAll(".key").forEach((b) => b.addEventListener("click", () => press(b.dataset.key)));
window.addEventListener("keydown", (e) => {
  const map = { Enter: "ok", " ": "ok", Escape: "left", ArrowLeft: "left", ArrowRight: "right" };
  const key = map[e.key] ?? (/^[0-9*#]$/.test(e.key) ? e.key : null);
  if (key) { e.preventDefault(); press(key); }
});

setInterval(() => { blink = !blink; if (mode === "play") render(); }, 400);
showMenu();
