'use strict';
const test = require('node:test');
const assert = require('node:assert');
const G = require('../src/game.js');

test('cellToGrid follows boustrophedon layout', () => {
  assert.deepStrictEqual(G.cellToGrid(1), { col: 0, row: 9 });
  assert.deepStrictEqual(G.cellToGrid(10), { col: 9, row: 9 });
  assert.deepStrictEqual(G.cellToGrid(11), { col: 9, row: 8 });
  assert.deepStrictEqual(G.cellToGrid(20), { col: 0, row: 8 });
  assert.deepStrictEqual(G.cellToGrid(100), { col: 0, row: 0 });
  assert.throws(() => G.cellToGrid(0), RangeError);
});

test('snakes go down, ladders go up, no overlap', () => {
  for (const [a, b] of Object.entries(G.SNAKES)) assert.ok(+a > b);
  for (const [a, b] of Object.entries(G.LADDERS)) assert.ok(+a < b);
  for (const k of Object.keys(G.SNAKES)) assert.ok(!(k in G.LADDERS));
});

test('plain move', () => {
  const m = G.computeMove(2, 3);
  assert.deepStrictEqual(m.steps, [3, 4, 5]);
  assert.strictEqual(m.jump, null);
  assert.strictEqual(m.final, 5);
});

test('ladder and snake', () => {
  assert.strictEqual(G.computeMove(0, 4).final, 14);
  assert.strictEqual(G.computeMove(0, 4).jump.type, 'ladder');
  assert.strictEqual(G.computeMove(12, 4).final, 6);
  assert.strictEqual(G.computeMove(12, 4).jump.type, 'snake');
});

test('exact roll needed to finish', () => {
  const over = G.computeMove(97, 5);
  assert.ok(over.overshoot);
  assert.strictEqual(over.final, 97);
  assert.strictEqual(G.computeMove(97, 3).final, 100);
});

test('applyRoll alternates players and detects winner', () => {
  const g = G.createGame([{ name: 'YOU' }, { name: 'CPU', cpu: true }]);
  G.applyRoll(g, 2);
  assert.strictEqual(g.players[0].pos, 2);
  assert.strictEqual(g.current, 1);
  G.applyRoll(g, 3);
  assert.strictEqual(g.current, 0);
  assert.strictEqual(g.turn, 2);
  g.players[0].pos = 99;
  G.applyRoll(g, 1);
  assert.strictEqual(g.winner, 0);
  assert.throws(() => G.applyRoll(g, 1));
});

test('rollDie stays in range', () => {
  assert.strictEqual(G.rollDie(() => 0), 1);
  assert.strictEqual(G.rollDie(() => 0.9999), 6);
});

test('random games always terminate with a winner', () => {
  for (let i = 0; i < 200; i++) {
    const g = G.createGame([{ name: 'A' }, { name: 'B' }]);
    let n = 0;
    while (g.winner === null && n++ < 100000) G.applyRoll(g, G.rollDie());
    assert.ok(g.winner !== null);
  }
});
