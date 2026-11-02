const test = require('node:test');
const assert = require('node:assert');
const L = require('../src/logic.js');

test('die rolls 1..6', () => {
  assert.strictEqual(L.rollDie(() => 0), 1);
  assert.strictEqual(L.rollDie(() => 0.9999), 6);
  for (let i = 0; i < 500; i++) { const r = L.rollDie(); assert.ok(r >= 1 && r <= 6); }
});

test('plain move steps square by square', () => {
  const r = L.move(0, 3);
  assert.deepStrictEqual(r.path, [1, 2, 3]);
  assert.strictEqual(r.final, 3);
  assert.strictEqual(r.jump, null);
});

test('ladder climbs and snake bites', () => {
  assert.deepStrictEqual([L.move(0, 4).final, L.move(0, 4).jump], [14, 'ladder']);
  assert.deepStrictEqual([L.move(12, 5).final, L.move(12, 5).jump], [7, 'snake']);
});

test('exact roll needed to win', () => {
  assert.strictEqual(L.move(97, 5).overshoot, true);
  assert.strictEqual(L.move(97, 5).final, 97);
  assert.strictEqual(L.move(97, 3).won, true);
  assert.strictEqual(L.move(94, 5).won, false); // 99 is fine, no snake there
});

test('snakes go down, ladders go up, no conflicts', () => {
  for (const [a, b] of Object.entries(L.LADDERS)) assert.ok(b > +a);
  for (const [a, b] of Object.entries(L.SNAKES)) { assert.ok(b < +a); assert.ok(!(a in L.LADDERS)); }
});

test('board layout is boustrophedon', () => {
  assert.deepStrictEqual(L.squareToCell(1), { col: 0, row: 9 });
  assert.deepStrictEqual(L.squareToCell(10), { col: 9, row: 9 });
  assert.deepStrictEqual(L.squareToCell(11), { col: 9, row: 8 });
  assert.deepStrictEqual(L.squareToCell(100), { col: 0, row: 0 });
});
