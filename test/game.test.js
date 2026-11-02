import test from 'node:test';
import assert from 'node:assert/strict';
import { LADDERS, SNAKES, move, rollDie, squareToCell, createGame, playTurn } from '../src/game.js';

test('rollDie returns 1..6', () => {
  assert.equal(rollDie(() => 0), 1);
  assert.equal(rollDie(() => 0.999999), 6);
  for (let i = 0; i < 500; i++) {
    const r = rollDie();
    assert.ok(r >= 1 && r <= 6);
  }
});

test('ladders go up, snakes go down, no overlaps', () => {
  for (const [a, b] of Object.entries(LADDERS)) assert.ok(b > +a);
  for (const [a, b] of Object.entries(SNAKES)) assert.ok(b < +a);
  const starts = [...Object.keys(LADDERS), ...Object.keys(SNAKES)];
  assert.equal(new Set(starts).size, starts.length);
  for (const end of [...Object.values(LADDERS), ...Object.values(SNAKES)]) {
    assert.ok(!starts.includes(String(end)), `chain at ${end}`);
  }
});

test('move handles plain, ladder, snake, bounce and win', () => {
  assert.deepEqual(move(0, 2), { from: 0, roll: 2, landed: 2, to: 2, event: null });
  assert.equal(move(0, 4).to, 14);
  assert.equal(move(0, 4).event, 'ladder');
  assert.equal(move(15, 2).to, 7);
  assert.equal(move(15, 2).event, 'snake');
  assert.equal(move(97, 5).to, 97);
  assert.equal(move(97, 5).event, 'bounce');
  assert.equal(move(96, 4).event, 'win');
  assert.throws(() => move(0, 7), RangeError);
});

test('squareToCell uses serpentine layout', () => {
  assert.deepEqual(squareToCell(1), { col: 0, row: 9 });
  assert.deepEqual(squareToCell(10), { col: 9, row: 9 });
  assert.deepEqual(squareToCell(11), { col: 9, row: 8 });
  assert.deepEqual(squareToCell(100), { col: 0, row: 0 });
});

test('playTurn alternates players, six grants extra turn, win stops game', () => {
  const g = createGame();
  playTurn(g, 2);
  assert.equal(g.turn, 1);
  playTurn(g, 6);
  assert.equal(g.turn, 1);
  assert.equal(g.players[1].pos, 6);
  g.players[0].pos = 96;
  g.turn = 0;
  playTurn(g, 4);
  assert.equal(g.winner, 0);
  playTurn(g, 3);
  assert.equal(g.players[0].pos, 100);
});

test('a full random game always terminates with a winner', () => {
  const g = createGame();
  for (let i = 0; i < 100000 && g.winner === null; i++) playTurn(g, rollDie());
  assert.notEqual(g.winner, null);
});
