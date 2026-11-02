import test from "node:test";
import assert from "node:assert/strict";
import { GOAL, LADDERS, SNAKES, createGame, playTurn, rollDie, squareToCell } from "../web/game.js";

test("rollDie returns 1..6", () => {
  assert.equal(rollDie(() => 0), 1);
  assert.equal(rollDie(() => 0.9999), 6);
  for (let i = 0; i < 1000; i++) {
    const r = rollDie();
    assert.ok(r >= 1 && r <= 6);
  }
});

test("squareToCell maps boustrophedon layout", () => {
  assert.deepEqual(squareToCell(1), { col: 0, row: 9 });
  assert.deepEqual(squareToCell(10), { col: 9, row: 9 });
  assert.deepEqual(squareToCell(11), { col: 9, row: 8 });
  assert.deepEqual(squareToCell(20), { col: 0, row: 8 });
  assert.deepEqual(squareToCell(100), { col: 0, row: 0 });
  assert.throws(() => squareToCell(0), RangeError);
  assert.throws(() => squareToCell(101), RangeError);
});

test("snakes go down, ladders go up, no overlap", () => {
  for (const [h, t] of Object.entries(SNAKES)) assert.ok(+h > t && +h < GOAL);
  for (const [b, t] of Object.entries(LADDERS)) assert.ok(+b < t && t <= GOAL);
  for (const k of Object.keys(SNAKES)) assert.equal(LADDERS[k], undefined);
});

test("simple move advances and passes turn", () => {
  const g = createGame([{ name: "A" }, { name: "B" }]);
  const { state, result } = playTurn(g, 2);
  assert.equal(state.players[0].pos, 2);
  assert.deepEqual(result.steps, [1, 2]);
  assert.equal(result.event, "move");
  assert.equal(state.current, 1);
  assert.equal(g.players[0].pos, 0, "original state not mutated");
});

test("ladder climbs and snake slides", () => {
  let g = createGame([{ name: "A" }]);
  ({ state: g } = playTurn(g, 4));
  assert.equal(g.players[0].pos, LADDERS[4]);
  g.players[0].pos = 12;
  const { state, result } = playTurn(g, 4);
  assert.equal(result.event, "snake");
  assert.equal(state.players[0].pos, SNAKES[16]);
});

test("six grants extra turn", () => {
  const g = createGame([{ name: "A" }, { name: "B" }]);
  const { state, result } = playTurn(g, 6);
  assert.equal(result.extraTurn, true);
  assert.equal(state.current, 0);
});

test("overshoot forfeits move; exact roll wins", () => {
  const g = createGame([{ name: "A" }, { name: "B" }]);
  g.players[0].pos = 97;
  const over = playTurn(g, 5);
  assert.equal(over.result.event, "bounce");
  assert.equal(over.state.players[0].pos, 97);
  const win = playTurn(g, 3);
  assert.equal(win.state.winner, 0);
  assert.equal(win.result.event, "win");
  assert.throws(() => playTurn(win.state, 1));
});

test("random games always terminate with a winner", () => {
  for (let n = 0; n < 200; n++) {
    let g = createGame([{ name: "A" }, { name: "B" }]);
    let i = 0;
    while (g.winner === null && i++ < 100000) g = playTurn(g, rollDie()).state;
    assert.notEqual(g.winner, null);
  }
});
