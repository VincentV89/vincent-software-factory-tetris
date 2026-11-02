// Pure game logic for Snakes & Ladders (no DOM). Works in browser and Node.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SnlGame = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BOARD_SIZE = 100;
  // Classic board layout. key = start square, value = end square.
  var SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
  var LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };

  // Board coordinates (col, row) with row 0 at the TOP, boustrophedon layout
  // where square 1 is bottom-left and 100 is top-left.
  function cellToGrid(n) {
    if (n < 1 || n > BOARD_SIZE) throw new RangeError('square out of range: ' + n);
    var idx = n - 1;
    var rowFromBottom = Math.floor(idx / 10);
    var offset = idx % 10;
    var col = rowFromBottom % 2 === 0 ? offset : 9 - offset;
    return { col: col, row: 9 - rowFromBottom };
  }

  // Compute the result of rolling `roll` from position `pos` (0 = off-board).
  // An exact roll is required to land on 100; overshooting means no move.
  function computeMove(pos, roll) {
    if (!(roll >= 1 && roll <= 6)) throw new RangeError('roll must be 1-6');
    var target = pos + roll;
    if (target > BOARD_SIZE) {
      return { from: pos, steps: [], jump: null, final: pos, overshoot: true };
    }
    var steps = [];
    for (var i = pos + 1; i <= target; i++) steps.push(i);
    var jump = null;
    if (SNAKES[target]) jump = { type: 'snake', from: target, to: SNAKES[target] };
    else if (LADDERS[target]) jump = { type: 'ladder', from: target, to: LADDERS[target] };
    return { from: pos, steps: steps, jump: jump, final: jump ? jump.to : target, overshoot: false };
  }

  function createGame(players) {
    return {
      players: players.map(function (p) { return { name: p.name, cpu: !!p.cpu, pos: 0 }; }),
      current: 0,
      winner: null,
      lastRoll: null,
      turn: 1
    };
  }

  // Apply a roll for the current player. Mutates and returns the move details.
  function applyRoll(game, roll) {
    if (game.winner !== null) throw new Error('game is over');
    var player = game.players[game.current];
    var move = computeMove(player.pos, roll);
    move.player = game.current;
    move.roll = roll;
    player.pos = move.final;
    game.lastRoll = roll;
    if (player.pos === BOARD_SIZE) {
      game.winner = game.current;
    } else {
      game.current = (game.current + 1) % game.players.length;
      if (game.current === 0) game.turn++;
    }
    return move;
  }

  function rollDie(rng) {
    return 1 + Math.floor((rng || Math.random)() * 6);
  }

  return {
    BOARD_SIZE: BOARD_SIZE,
    SNAKES: SNAKES,
    LADDERS: LADDERS,
    cellToGrid: cellToGrid,
    computeMove: computeMove,
    createGame: createGame,
    applyRoll: applyRoll,
    rollDie: rollDie
  };
});
