'use strict';
// Runs the UI script against a stubbed DOM/canvas to make sure every screen
// renders without throwing and a full game can be played through the inputs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

const SITE = path.join(__dirname, '..', 'site');

function makeCanvas() {
  const c = { width: 0, height: 0, pixels: null, style: '' };
  const ctx = {
    fillStyle: '#000',
    fillRect(x, y, w, h) {
      if (!c.pixels) c.pixels = new Uint8Array(c.width * c.height);
      const on = this.fillStyle.toLowerCase() === '#43523d' ? 1 : 0;
      for (let j = Math.max(0, y); j < Math.min(c.height, y + h); j++) {
        for (let i = Math.max(0, x); i < Math.min(c.width, x + w); i++) c.pixels[j * c.width + i] = on;
      }
    },
  };
  c.getContext = () => ctx;
  return c;
}

function writePng(file, canvas, scale) {
  const w = canvas.width * scale, h = canvas.height * scale;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const on = canvas.pixels[Math.floor(y / scale) * canvas.width + Math.floor(x / scale)];
      const o = y * (w * 3 + 1) + 1 + x * 3;
      const rgb = on ? [0x43, 0x52, 0x3d] : [0xc7, 0xf0, 0xd8];
      raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2];
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
  });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, cr]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]));
}

function boot() {
  const canvas = makeCanvas();
  const listeners = {};
  const buttons = {};
  const document = {
    getElementById: () => canvas,
    addEventListener: (t, fn) => { listeners[t] = fn; },
    querySelectorAll: () => ['ok', 'back', 'up', 'down', '5'].map((k) => {
      const b = { getAttribute: () => k, addEventListener: (t, fn) => { buttons[k] = fn; } };
      return b;
    }),
  };
  const timers = [];
  const sandbox = {
    document,
    localStorage: { getItem: () => 'off', setItem() {} },
    setTimeout: (fn, ms) => { timers.push(fn); return timers.length; },
    setInterval: () => 0,
    Math, Promise, Object, String, Number, console,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const f of ['game.js', 'font.js', 'app.js']) {
    vm.runInContext(fs.readFileSync(path.join(SITE, f), 'utf8'), sandbox, { filename: f });
  }
  const press = (key) => listeners.keydown({ key, preventDefault() {} });
  const flush = async () => {
    for (let n = 0; n < 100000 && timers.length; n++) {
      timers.shift()();
      await new Promise((r) => setImmediate(r));
    }
  };
  return { canvas, press, click: (k) => buttons[k](), flush };
}

test('menu renders and full 1-player game completes', async () => {
  const ui = boot();
  assert.ok(ui.canvas.pixels.some((p) => p === 1), 'menu drew something');
  if (process.env.SNAPSHOT_DIR) writePng(path.join(process.env.SNAPSHOT_DIR, 'menu.png'), ui.canvas, 6);
  ui.press('Enter'); // 1 PLAYER
  await ui.flush();
  if (process.env.SNAPSHOT_DIR) writePng(path.join(process.env.SNAPSHOT_DIR, 'play.png'), ui.canvas, 6);
  let guard = 0;
  // keep rolling until the game-over screen appears ("C = MENU" is only drawn there)
  let over = false;
  while (!over && guard++ < 2000) {
    ui.click('5');
    await ui.flush();
    ui.press('ArrowDown'); // no-op during play; on game over it is ignored too
    over = await isOver(ui);
  }
  assert.ok(over, 'game reached game-over screen');
  if (process.env.SNAPSHOT_DIR) writePng(path.join(process.env.SNAPSHOT_DIR, 'over.png'), ui.canvas, 6);
  ui.press('Escape');
  ui.press('ArrowDown');
  ui.press('Enter'); // 2 PLAYERS
  await ui.flush();
  ui.press('5');
  await ui.flush();
  ui.press('Escape'); // back mid-game must not throw
});

async function isOver(ui) {
  // Game-over screen has a frame from x=16..119 at y=18; the play screen draws the board there.
  const px = ui.canvas.pixels, w = ui.canvas.width;
  let row = 0;
  for (let x = 16; x < 120; x++) row += px[18 * w + x];
  return row === 104 && px[18 * w + 1] === 0;
}
