'use strict';
// Drives src/main.js against a minimal fake DOM/canvas to catch runtime errors
// and verify the screen flow (splash -> menu -> game -> roll) end to end.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeEnv() {
  const W = 168, H = 96, buf = new Uint8Array(W * H);
  const ctx = {
    fillStyle: '#c7f0d8',
    fillRect(x, y, w, h) {
      const on = this.fillStyle === '#43523d' ? 1 : 0;
      for (let j = Math.max(0, y); j < Math.min(H, y + h); j++)
        for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) buf[j * W + i] = on;
    }
  };
  const listeners = {};
  const rafQ = [];
  const document = {
    getElementById: () => ({ getContext: () => ctx }),
    addEventListener: (t, fn) => { listeners[t] = fn; },
    querySelectorAll: () => []
  };
  const window = { document };
  const sandbox = {
    window, document, self: window, console, setTimeout, Math, Promise, String, Object, Array,
    performance: { now: () => Date.now() },
    requestAnimationFrame: (fn) => { rafQ.push(fn); }
  };
  window.requestAnimationFrame = sandbox.requestAnimationFrame;
  vm.createContext(sandbox);
  for (const f of ['game.js', 'main.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), sandbox, { filename: f });
  }
  const tick = () => { const q = rafQ.splice(0); q.forEach((fn) => fn()); };
  const key = (k) => listeners.keydown({ key: k, repeat: false, preventDefault() {} });
  const dump = () => {
    let s = '';
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) s += buf[y * W + x] ? '#' : '.'; s += '\n'; }
    return s;
  };
  const lit = () => buf.reduce((a, b) => a + b, 0);
  return { tick, key, dump, lit };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(env, ms) { const end = Date.now() + ms; while (Date.now() < end) { env.tick(); await sleep(16); } }

test('screens render and a full turn plays out', async () => {
  const env = makeEnv();
  await run(env, 50);
  assert.ok(env.lit() > 200, 'splash drew something');
  env.key('Enter'); await run(env, 50);          // -> menu
  const menu = env.dump();
  env.key('ArrowDown'); env.key('ArrowDown'); env.key('Enter'); await run(env, 50); // -> instructions
  assert.notStrictEqual(env.dump(), menu);
  env.key('Escape'); env.key('ArrowUp'); env.key('ArrowUp'); env.key('Enter'); // -> 1 player game
  await run(env, 50);
  env.key('Enter');                                // roll for player
  await run(env, 6000);                            // player move + CPU move
  if (process.env.DUMP_LCD) fs.writeFileSync(process.env.DUMP_LCD, env.dump());
  assert.ok(env.lit() > 500, 'board drawn');
});
