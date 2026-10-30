// Pure, framework-agnostic Tetris game logic.

export const COLS = 10;
export const ROWS = 20;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export const PIECE_TYPES: readonly PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export type Cell = PieceType | null;
export type Board = Cell[][];
export type Matrix = number[][];

export interface Piece {
  type: PieceType;
  shape: Matrix;
  x: number;
  y: number;
}

export type Status = 'ready' | 'playing' | 'paused' | 'over';

export interface GameState {
  board: Board;
  current: Piece | null;
  next: PieceType;
  bag: PieceType[];
  seed: number;
  score: number;
  lines: number;
  level: number;
  status: Status;
}

export const SHAPES: Record<PieceType, Matrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

/** Points for clearing 0..4 lines at once, multiplied by the current level. */
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;
export const LINES_PER_LEVEL = 10;

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

/** Rotate a square matrix clockwise (dir = 1) or counter-clockwise (dir = -1). */
export function rotateMatrix(m: Matrix, dir: 1 | -1): Matrix {
  const n = m.length;
  return m.map((row, y) =>
    row.map((_, x) => (dir === 1 ? m[n - 1 - x][y] : m[x][n - 1 - y])),
  );
}

export function collides(board: Board, shape: Matrix, x: number, y: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const bx = x + c;
      const by = y + r;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx] !== null) return true;
    }
  }
  return false;
}

/** Mulberry32 PRNG step: returns [value in [0,1), nextSeed]. */
export function nextRandom(seed: number): [number, number] {
  const s = (seed + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** Produce a shuffled "7-bag" of all piece types. */
export function shuffledBag(seed: number): [PieceType[], number] {
  const bag = [...PIECE_TYPES];
  let s = seed;
  for (let i = bag.length - 1; i > 0; i--) {
    const [r, ns] = nextRandom(s);
    s = ns;
    const j = Math.floor(r * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return [bag, s];
}

function drawPiece(bag: PieceType[], seed: number): [PieceType, PieceType[], number] {
  let b = bag;
  let s = seed;
  if (b.length === 0) [b, s] = shuffledBag(s);
  return [b[0], b.slice(1), s];
}

export function spawnPiece(type: PieceType): Piece {
  const shape = SHAPES[type];
  return { type, shape, x: Math.floor((COLS - shape[0].length) / 2), y: type === 'I' ? -1 : 0 };
}

export function dropInterval(level: number): number {
  return Math.max(80, 800 - (level - 1) * 70);
}

export function createGame(seed: number = Date.now()): GameState {
  const [first, bag1, s1] = drawPiece([], seed >>> 0);
  const [next, bag2, s2] = drawPiece(bag1, s1);
  return {
    board: createBoard(),
    current: spawnPiece(first),
    next,
    bag: bag2,
    seed: s2,
    score: 0,
    lines: 0,
    level: 1,
    status: 'ready',
  };
}

/** Write the piece into a copy of the board. */
export function mergePiece(board: Board, piece: Piece): Board {
  const out = board.map((row) => [...row]);
  piece.shape.forEach((row, r) =>
    row.forEach((v, c) => {
      const by = piece.y + r;
      if (v && by >= 0 && by < ROWS) out[by][piece.x + c] = piece.type;
    }),
  );
  return out;
}

export function clearLines(board: Board): [Board, number] {
  const remaining = board.filter((row) => row.some((c) => c === null));
  const cleared = ROWS - remaining.length;
  const empty = Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(null));
  return [[...empty, ...remaining], cleared];
}

/** Lock the current piece, clear lines, update score and spawn the next piece. */
function lockPiece(state: GameState, extraScore = 0): GameState {
  if (!state.current) return state;
  const piece = state.current;
  const merged = mergePiece(state.board, piece);
  const [board, cleared] = clearLines(merged);
  const lines = state.lines + cleared;
  const score = state.score + extraScore + LINE_SCORES[cleared] * state.level;
  const level = Math.floor(lines / LINES_PER_LEVEL) + 1;

  // Locking a piece that is partly above the visible board ends the game.
  const toppedOut = piece.shape.some((row, r) => row.some((v) => v && piece.y + r < 0));

  const spawned = spawnPiece(state.next);
  const [next, bag, seed] = drawPiece(state.bag, state.seed);
  const over = toppedOut || collides(board, spawned.shape, spawned.x, spawned.y);

  return {
    ...state,
    board,
    current: over ? null : spawned,
    next,
    bag,
    seed,
    score,
    lines,
    level,
    status: over ? 'over' : state.status,
  };
}

export function move(state: GameState, dx: number): GameState {
  const p = state.current;
  if (state.status !== 'playing' || !p) return state;
  if (collides(state.board, p.shape, p.x + dx, p.y)) return state;
  return { ...state, current: { ...p, x: p.x + dx } };
}

const KICKS = [0, -1, 1, -2, 2];

export function rotate(state: GameState, dir: 1 | -1 = 1): GameState {
  const p = state.current;
  if (state.status !== 'playing' || !p || p.type === 'O') return state;
  const shape = rotateMatrix(p.shape, dir);
  for (const dx of KICKS) {
    if (!collides(state.board, shape, p.x + dx, p.y)) {
      return { ...state, current: { ...p, shape, x: p.x + dx } };
    }
  }
  // Try nudging up one row (useful against the floor).
  if (!collides(state.board, shape, p.x, p.y - 1)) {
    return { ...state, current: { ...p, shape, y: p.y - 1 } };
  }
  return state;
}

/** Gravity step. Moves the piece down or locks it if it can't move. */
export function tick(state: GameState): GameState {
  const p = state.current;
  if (state.status !== 'playing' || !p) return state;
  if (collides(state.board, p.shape, p.x, p.y + 1)) return lockPiece(state);
  return { ...state, current: { ...p, y: p.y + 1 } };
}

/** Player-initiated soft drop: like a tick, but awards 1 point per cell. */
export function softDrop(state: GameState): GameState {
  const p = state.current;
  if (state.status !== 'playing' || !p) return state;
  if (collides(state.board, p.shape, p.x, p.y + 1)) return lockPiece(state);
  return { ...state, current: { ...p, y: p.y + 1 }, score: state.score + 1 };
}

export function ghostY(board: Board, piece: Piece): number {
  let y = piece.y;
  while (!collides(board, piece.shape, piece.x, y + 1)) y++;
  return y;
}

/** Hard drop: instantly drop and lock, awarding 2 points per cell. */
export function hardDrop(state: GameState): GameState {
  const p = state.current;
  if (state.status !== 'playing' || !p) return state;
  const y = ghostY(state.board, p);
  return lockPiece({ ...state, current: { ...p, y } }, (y - p.y) * 2);
}

export function start(state: GameState): GameState {
  return state.status === 'ready' ? { ...state, status: 'playing' } : state;
}

export function togglePause(state: GameState): GameState {
  if (state.status === 'playing') return { ...state, status: 'paused' };
  if (state.status === 'paused') return { ...state, status: 'playing' };
  return state;
}

export function restart(seed: number = Date.now()): GameState {
  return { ...createGame(seed), status: 'playing' };
}
