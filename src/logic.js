// Pure game rules for Snakes & Ladders. No DOM access — unit tested in test/.

export const FINAL_SQUARE = 100;

// Ladder bottom -> top
export const LADDERS = Object.freeze({
  4: 14,
  9: 31,
  28: 46,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
});

// Snake head -> tail
export const SNAKES = Object.freeze({
  17: 7,
  54: 34,
  62: 43,
  87: 66,
  93: 73,
  95: 75,
  99: 78,
});

/** Board coordinates (0-based) for square 1..100; row 0 is the bottom row. */
export function squareToCell(square) {
  if (!Number.isInteger(square) || square < 1 || square > FINAL_SQUARE) {
    throw new RangeError(`square out of range: ${square}`);
  }
  const idx = square - 1;
  const row = Math.floor(idx / 10);
  const offset = idx % 10;
  const col = row % 2 === 0 ? offset : 9 - offset;
  return { row, col };
}

export function rollDie(rng = Math.random) {
  return Math.floor(rng() * 6) + 1;
}

export function createGame(playerNames) {
  if (!Array.isArray(playerNames) || playerNames.length < 1) {
    throw new Error('at least one player required');
  }
  return {
    players: playerNames.map((name) => ({ name, position: 0 })),
    current: 0,
    winner: null,
    lastMove: null,
  };
}

/**
 * Compute a move without mutating anything.
 * Players start off-board at 0. An exact roll is needed to reach 100;
 * overshooting means the player stays put.
 */
export function computeMove(position, roll) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    throw new RangeError(`invalid roll: ${roll}`);
  }
  const target = position + roll;
  if (target > FINAL_SQUARE) {
    return { from: position, landed: position, to: position, steps: [], via: null, bounced: true };
  }
  const steps = [];
  for (let s = position + 1; s <= target; s++) steps.push(s);
  let to = target;
  let via = null;
  if (LADDERS[target]) {
    to = LADDERS[target];
    via = 'ladder';
  } else if (SNAKES[target]) {
    to = SNAKES[target];
    via = 'snake';
  }
  return { from: position, landed: target, to, steps, via, bounced: false };
}

/** Apply a roll for the current player, returning a new state. */
export function playTurn(state, roll) {
  if (state.winner !== null) throw new Error('game is over');
  const player = state.players[state.current];
  const move = computeMove(player.position, roll);
  const players = state.players.map((p, i) =>
    i === state.current ? { ...p, position: move.to } : p,
  );
  const won = move.to === FINAL_SQUARE;
  return {
    players,
    current: won ? state.current : (state.current + 1) % players.length,
    winner: won ? state.current : null,
    lastMove: { player: state.current, roll, ...move },
  };
}
