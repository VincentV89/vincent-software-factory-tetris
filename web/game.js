// Pure game logic for Snakes & Ladders (no DOM). Shared by the browser UI and the tests.

export const GOAL = 100;
export const COLS = 10;

// head -> tail
export const SNAKES = Object.freeze({
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
});

// bottom -> top
export const LADDERS = Object.freeze({
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
});

/** Roll a six-sided die. `rng` returns a float in [0, 1). */
export function rollDie(rng = Math.random) {
  return Math.floor(rng() * 6) + 1;
}

/**
 * Convert a square number (1..100) to a zero-based {col, row} grid coordinate,
 * where row 0 is the TOP row of the board (for drawing). Square 1 is bottom-left
 * and the board snakes back and forth (boustrophedon).
 */
export function squareToCell(square) {
  if (!Number.isInteger(square) || square < 1 || square > GOAL) {
    throw new RangeError(`square out of range: ${square}`);
  }
  const idx = square - 1;
  const rowFromBottom = Math.floor(idx / COLS);
  const offset = idx % COLS;
  const col = rowFromBottom % 2 === 0 ? offset : COLS - 1 - offset;
  return { col, row: COLS - 1 - rowFromBottom };
}

export function createGame(players) {
  if (!Array.isArray(players) || players.length < 1) {
    throw new Error("at least one player required");
  }
  return {
    players: players.map((p, i) => ({
      name: p.name ?? `P${i + 1}`,
      cpu: Boolean(p.cpu),
      pos: 0, // 0 = off the board, waiting to enter at square 1
    })),
    current: 0,
    winner: null,
  };
}

/**
 * Apply a die roll for the current player. Returns a NEW state plus the path
 * the token travels (for animation) and a description of what happened.
 *
 * Rules: you must land exactly on 100; an overshooting roll forfeits the move.
 * Landing on a ladder foot climbs it; landing on a snake head slides down.
 * Rolling a 6 grants another roll.
 */
export function playTurn(state, roll) {
  if (state.winner !== null) throw new Error("game is over");
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    throw new RangeError(`invalid roll: ${roll}`);
  }
  const players = state.players.map((p) => ({ ...p }));
  const player = players[state.current];
  const from = player.pos;
  const steps = [];
  let event = "move";
  let jumpTo = null;

  if (from + roll > GOAL) {
    event = "bounce";
  } else {
    for (let s = from + 1; s <= from + roll; s++) steps.push(s);
    let pos = from + roll;
    if (SNAKES[pos] !== undefined) {
      event = "snake";
      jumpTo = SNAKES[pos];
      pos = jumpTo;
    } else if (LADDERS[pos] !== undefined) {
      event = "ladder";
      jumpTo = LADDERS[pos];
      pos = jumpTo;
    }
    player.pos = pos;
  }

  let winner = null;
  if (player.pos === GOAL) {
    winner = state.current;
    event = event === "ladder" ? "ladder-win" : "win";
  }

  const extraTurn = roll === 6 && winner === null;
  const next = winner !== null || extraTurn
    ? state.current
    : (state.current + 1) % players.length;

  return {
    state: {
      players,
      current: next,
      winner,
    },
    result: { player: state.current, roll, from, to: player.pos, steps, jumpTo, event, extraTurn },
  };
}
