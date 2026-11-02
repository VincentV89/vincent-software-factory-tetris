// Core Snakes & Ladders rules. Pure functions, no DOM — shared by the browser UI and tests.

export const BOARD_SIZE = 100;

// start -> end. Ladders go up, snakes go down.
export const LADDERS = Object.freeze({ 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 71: 91, 80: 99 });
export const SNAKES = Object.freeze({ 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 95: 75, 98: 79 });

export function rollDie(rng = Math.random) {
  return 1 + Math.floor(rng() * 6);
}

/**
 * Resolve a move. An exact roll is needed to land on 100; overshooting means the token stays put.
 * Returns { from, roll, landed, to, event } where event is 'ladder' | 'snake' | 'bounce' | 'win' | null.
 */
export function move(from, roll) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) throw new RangeError(`invalid roll: ${roll}`);
  const landed = from + roll;
  if (landed > BOARD_SIZE) return { from, roll, landed: from, to: from, event: 'bounce' };
  if (LADDERS[landed]) return { from, roll, landed, to: LADDERS[landed], event: 'ladder' };
  if (SNAKES[landed]) return { from, roll, landed, to: SNAKES[landed], event: 'snake' };
  return { from, roll, landed, to: landed, event: landed === BOARD_SIZE ? 'win' : null };
}

/** Board square (1..100) -> {col,row} with row 0 at the top, boustrophedon layout. */
export function squareToCell(square) {
  const idx = square - 1;
  const rowFromBottom = Math.floor(idx / 10);
  const offset = idx % 10;
  const col = rowFromBottom % 2 === 0 ? offset : 9 - offset;
  return { col, row: 9 - rowFromBottom };
}

export function createGame(players = ['YOU', 'CPU']) {
  return { players: players.map((name) => ({ name, pos: 0 })), turn: 0, winner: null, log: [] };
}

/** Play one turn for the current player. Mutates and returns the game. Rolling a 6 grants another turn. */
export function playTurn(game, roll) {
  if (game.winner !== null) return game;
  const player = game.players[game.turn];
  const result = move(player.pos, roll);
  player.pos = result.to;
  game.log.push({ player: game.turn, ...result });
  if (result.to === BOARD_SIZE) {
    game.winner = game.turn;
  } else if (roll !== 6) {
    game.turn = (game.turn + 1) % game.players.length;
  }
  return game;
}
