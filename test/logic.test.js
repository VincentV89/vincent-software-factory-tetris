import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LADDERS,
  SNAKES,
  FINAL_SQUARE,
  squareToCell,
  rollDie,
  createGame,
  computeMove,
  playTurn,
} from '../src/logic.js';

test('squareToCell follows a boustrophedon layout', () => {
  assert.deepEqual(squareToCell(1), { row: 0, col: 0 });
  assert.deepEqual(squareToCell(10), { row: 0, col: 9 });
  assert.deepEqual(squareToCell(11), { row: 1, col: 9 });
  assert.deepEqual(squareToCell(20), { row: 1, col: 0 });
  assert.deepEqual(squareToCell(100), { row: 9, col: 0 });
  assert.throws(() => squareToCell(0), RangeError);
  assert.throws(() => squareToCell(101), RangeError);
});

test('snakes go down, ladders go up, and they never share squares', () => {
  for (const [a, b] of Object.entries(LADDERS)) assert.ok(Number(a) < b);
  for (const [a, b] of Object.entries(SNAKES)) assert.ok(Number(a) > b);
  const starts = [...Object.keys(LADDERS), ...Object.keys(SNAKES)].map(Number);
  const ends = [...Object.values(LADDERS), ...Object.values(SNAKES)];
  assert.equal(new Set(starts).size, starts.length);
  for (const e of ends) assert.ok(!starts.includes(e), `end ${e} is also a start`);
  assert.ok(!starts.includes(FINAL_SQUARE));
});

test('rollDie returns 1..6', () => {
  assert.equal(rollDie(() => 0), 1);
  assert.equal(rollDie(() => 0.999999), 6);
  for (let i = 0; i < 200; i++) {
    const r = rollDie();
    assert.ok(r >= 1 && r <= 6);
  }
});

test('plain move steps through each square', () => {
  const m = computeMove(0, 3);
  assert.deepEqual(m.steps, [1, 2, 3]);
  assert.equal(m.to, 3);
  assert.equal(m.via, null);
});

test('landing on a ladder climbs it', () => {
  const m = computeMove(1, 3);
  assert.equal(m.landed, 4);
  assert.equal(m.to, 14);
  assert.equal(m.via, 'ladder');
});

test('landing on a snake slides down', () => {
  const m = computeMove(14, 3);
  assert.equal(m.landed, 17);
  assert.equal(m.to, 7);
  assert.equal(m.via, 'snake');
});

test('overshooting 100 keeps the player in place', () => {
  const m = computeMove(98, 5);
  assert.equal(m.bounced, true);
  assert.equal(m.to, 98);
  assert.deepEqual(m.steps, []);
});

test('invalid roll throws', () => {
  assert.throws(() => computeMove(0, 0), RangeError);
  assert.throws(() => computeMove(0, 7), RangeError);
});

test('playTurn alternates players and detects a winner', () => {
  let s = createGame(['P1', 'CPU']);
  s = playTurn(s, 2);
  assert.equal(s.players[0].position, 2);
  assert.equal(s.current, 1);
  s = playTurn(s, 1);
  assert.equal(s.players[1].position, 1);
  assert.equal(s.current, 0);

  s = { ...s, players: [{ name: 'P1', position: 96 }, s.players[1]] };
  s = playTurn(s, 4);
  assert.equal(s.winner, 0);
  assert.equal(s.players[0].position, 100);
  assert.throws(() => playTurn(s, 1), /game is over/);
});

test('playTurn does not mutate the input state', () => {
  const s = createGame(['A', 'B']);
  const copy = structuredClone(s);
  playTurn(s, 5);
  assert.deepEqual(s, copy);
});
