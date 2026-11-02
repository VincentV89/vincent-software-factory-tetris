'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const SL = require('../site/game.js');
const Font = require('../site/font.js');

test('squareToCell follows boustrophedon layout', () => {
  assert.deepEqual(SL.squareToCell(1), { row: 9, col: 0 });
  assert.deepEqual(SL.squareToCell(10), { row: 9, col: 9 });
  assert.deepEqual(SL.squareToCell(11), { row: 8, col: 9 });
  assert.deepEqual(SL.squareToCell(20), { row: 8, col: 0 });
  assert.deepEqual(SL.squareToCell(100), { row: 0, col: 0 });
  assert.throws(() => SL.squareToCell(0), RangeError);
  assert.throws(() => SL.squareToCell(101), RangeError);
});

test('board config is valid', () => {
  const starts = new Set();
  for (const [from, to] of Object.entries(SL.LADDERS)) {
    assert.ok(+to > +from, `ladder ${from} goes up`);
    starts.add(+from);
  }
  for (const [from, to] of Object.entries(SL.SNAKES)) {
    assert.ok(+to < +from, `snake ${from} goes down`);
    assert.ok(!starts.has(+from), `square ${from} not both`);
    assert.ok(+from < 100);
  }
  const ends = [...Object.values(SL.LADDERS), ...Object.values(SL.SNAKES)];
  for (const e of ends) {
    assert.ok(!(e in SL.LADDERS) && !(e in SL.SNAKES), `no chain at ${e}`);
  }
});

test('rollDie returns 1..6', () => {
  assert.equal(SL.rollDie(() => 0), 1);
  assert.equal(SL.rollDie(() => 0.9999), 6);
  for (let i = 0; i < 500; i++) {
    const r = SL.rollDie();
    assert.ok(r >= 1 && r <= 6 && Number.isInteger(r));
  }
});

test('plain move advances and passes turn', () => {
  const g = SL.createGame();
  const { state, move } = SL.applyRoll(g, 2);
  assert.equal(move.kind, 'move');
  assert.equal(state.players[0].position, 2);
  assert.equal(state.current, 1);
  assert.equal(g.players[0].position, 0, 'original state is not mutated');
});

test('ladder climbs, snake slides', () => {
  let g = SL.createGame();
  let r = SL.applyRoll(g, 3); // square 3 -> ladder to 22
  assert.equal(r.move.kind, 'ladder');
  assert.equal(r.state.players[0].position, 22);
  g = r.state; g.players[1].position = 12;
  r = SL.applyRoll(g, 5); // 17 -> snake to 4
  assert.equal(r.move.kind, 'snake');
  assert.equal(r.move.landed, 17);
  assert.equal(r.state.players[1].position, 4);
});

test('rolling 6 grants an extra turn', () => {
  const g = SL.createGame();
  const r = SL.applyRoll(g, 6);
  assert.equal(r.move.extraTurn, true);
  assert.equal(r.state.current, 0);
});

test('exact roll needed to win; overshoot bounces', () => {
  const g = SL.createGame();
  g.players[0].position = 97;
  let r = SL.applyRoll(g, 5);
  assert.equal(r.move.kind, 'bounce');
  assert.equal(r.state.players[0].position, 97);
  assert.equal(r.state.winner, null);
  r = SL.applyRoll(g, 3);
  assert.equal(r.move.kind, 'win');
  assert.equal(r.state.winner, 0);
  assert.throws(() => SL.applyRoll(r.state, 1), /game is over/);
});

test('invalid rolls rejected', () => {
  const g = SL.createGame();
  assert.throws(() => SL.applyRoll(g, 0), RangeError);
  assert.throws(() => SL.applyRoll(g, 7), RangeError);
});

test('simulated games always finish', () => {
  for (let n = 0; n < 200; n++) {
    let g = SL.createGame(['A', 'B']);
    let rolls = 0;
    while (g.winner === null) {
      g = SL.applyRoll(g, SL.rollDie()).state;
      if (++rolls > 10000) assert.fail('game did not finish');
    }
    assert.equal(g.players[g.winner].position, 100);
  }
});

test('font has glyphs for every UI character', () => {
  const strings = ['SNAKES', '& LADDERS', '1 PLAYER', '2 PLAYERS', 'SOUND:ON', 'SOUND:OFF',
    'SELECT', '5:ROLL', 'WAIT', '...', 'YOU ROLLS', 'TOO HIGH', 'NEED 3', 'LADDER!',
    'UP TO 100', 'SNAKE!', 'DOWN 6', 'SIX!', 'GAME OVER', 'ROLLS: 12', 'OK = AGAIN',
    'C = MENU', 'WINNER!', '>', '?', '0123456789'];
  for (const s of strings) {
    for (const ch of s) {
      assert.ok(Font.GLYPHS[ch], `missing glyph '${ch}' in "${s}"`);
    }
  }
});
