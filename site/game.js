/*
 * Snakes & Ladders - pure game logic (no DOM).
 * Works in the browser (window.SnakesLadders) and in Node (module.exports).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.SnakesLadders = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BOARD_SIZE = 100;
  const COLS = 10;

  // Compact layout that stays readable on a tiny LCD. key = start square, value = end square.
  const LADDERS = Object.freeze({
    3: 22, 8: 30, 28: 55, 58: 77, 75: 86, 80: 99,
  });
  const SNAKES = Object.freeze({
    17: 4, 46: 25, 62: 43, 88: 66, 95: 73,
  });

  function rollDie(rng) {
    const r = typeof rng === 'function' ? rng() : Math.random();
    return Math.min(6, Math.floor(r * 6) + 1);
  }

  /** Convert square number (1..100) to {row, col} with row 0 at the TOP, boustrophedon order. */
  function squareToCell(square) {
    if (!Number.isInteger(square) || square < 1 || square > BOARD_SIZE) {
      throw new RangeError('square out of range: ' + square);
    }
    const idx = square - 1;
    const rowFromBottom = Math.floor(idx / COLS);
    const offset = idx % COLS;
    const col = rowFromBottom % 2 === 0 ? offset : COLS - 1 - offset;
    return { row: COLS - 1 - rowFromBottom, col: col };
  }

  function createGame(playerNames) {
    const names = playerNames && playerNames.length ? playerNames : ['YOU', 'CPU'];
    return {
      players: names.map(function (name) { return { name: name, position: 0 }; }),
      current: 0,
      winner: null,
      lastRoll: null,
      log: [],
    };
  }

  /**
   * Apply a die roll for the current player. Returns a new state and a
   * description of the move: { from, landed, to, roll, kind: 'move'|'ladder'|'snake'|'bounce'|'win' }.
   * Rule: an exact roll is required to land on 100; overshooting means no move.
   * Rolling a 6 grants an extra turn (unless the player wins).
   */
  function applyRoll(state, roll) {
    if (state.winner !== null) {
      throw new Error('game is over');
    }
    if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
      throw new RangeError('invalid roll: ' + roll);
    }
    const players = state.players.map(function (p) { return { name: p.name, position: p.position }; });
    const player = players[state.current];
    const from = player.position;
    let landed = from + roll;
    let to;
    let kind;

    if (landed > BOARD_SIZE) {
      landed = from;
      to = from;
      kind = 'bounce';
    } else if (LADDERS[landed]) {
      to = LADDERS[landed];
      kind = 'ladder';
    } else if (SNAKES[landed]) {
      to = SNAKES[landed];
      kind = 'snake';
    } else {
      to = landed;
      kind = 'move';
    }

    player.position = to;
    let winner = null;
    if (to === BOARD_SIZE) {
      winner = state.current;
      kind = kind === 'ladder' ? 'ladder' : 'win';
    }

    const extraTurn = roll === 6 && winner === null;
    const next = winner !== null || extraTurn ? state.current : (state.current + 1) % players.length;
    const move = { player: state.current, from: from, landed: landed, to: to, roll: roll, kind: kind, extraTurn: extraTurn };

    return {
      state: {
        players: players,
        current: next,
        winner: winner,
        lastRoll: roll,
        log: state.log.concat([move]).slice(-20),
      },
      move: move,
    };
  }

  return {
    BOARD_SIZE: BOARD_SIZE,
    COLS: COLS,
    LADDERS: LADDERS,
    SNAKES: SNAKES,
    rollDie: rollDie,
    squareToCell: squareToCell,
    createGame: createGame,
    applyRoll: applyRoll,
  };
});
