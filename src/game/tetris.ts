// Pure, framework-agnostic Tetris game logic.

export const COLS = 10;
export const ROWS = 20;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Cell = PieceType | null;
export type Board = Cell[][];
export type Matrix = number[][];

export const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

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

export interface Piece {
  type: PieceType;
  shape: Matrix;
  x: number;
  y: number;
}

export type Status = 'playing' | 'paused' | 'over';

export interface GameState {
  board: Board;
  current: Piece;
  next: PieceType;
  bag: PieceType[];
  score: number;
  lines: number;
  level: number;
  status: Status;
}

export type Action =
  | { type: 'left' }
  | { type: 'right' }
  | { type: 'down' } // soft drop (player)
  | { type: 'tick' } // gravity
  | { type: 'rotate' }
  | { type: 'hardDrop' }
  | { type: 'togglePause' }
  | { type: 'restart' };

/** Points for clearing 1..4 lines at once (multiplied by level). */
export const LINE_SCORES = [0, 100, 300, 500, 800];

export type Rng = () => number;

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

/** 7-bag randomizer: returns a shuffled bag of all seven pieces. */
export function newBag(rng: Rng = Math.random): PieceType[] {
  const bag = [...PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export function spawn(type: PieceType): Piece {
  const shape = SHAPES[type];
  return { type, shape, x: Math.floor((COLS - shape[0].length) / 2), y: type === 'I' ? -1 : 0 };
}

export function rotateMatrix(m: Matrix): Matrix {
  const n = m.length;
  return m[0].map((_, c) => Array.from({ length: n }, (_, r) => m[n - 1 - r][c]));
}

export function collides(board: Board, piece: Piece): boolean {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const x = piece.x + c;
      const y = piece.y + r;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && board[y][x]) return true;
    }
  }
  return false;
}

export function merge(board: Board, piece: Piece): Board {
  const out = board.map((row) => [...row]);
  piece.shape.forEach((row, r) =>
    row.forEach((v, c) => {
      const y = piece.y + r;
      if (v && y >= 0) out[y][piece.x + c] = piece.type;
    }),
  );
  return out;
}

export function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((c) => c === null));
  const cleared = ROWS - kept.length;
  const fresh = Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(null));
  return { board: [...fresh, ...kept], cleared };
}

export function ghostY(board: Board, piece: Piece): number {
  let y = piece.y;
  while (!collides(board, { ...piece, y: y + 1 })) y++;
  return y;
}

/** Gravity interval in ms for a given level. */
export function dropInterval(level: number): number {
  return Math.max(100, 800 - (level - 1) * 70);
}

function takeNext(bag: PieceType[], rng: Rng): { type: PieceType; bag: PieceType[] } {
  const b = bag.length ? bag : newBag(rng);
  return { type: b[0], bag: b.slice(1) };
}

export function createGame(rng: Rng = Math.random): GameState {
  const first = takeNext([], rng);
  const second = takeNext(first.bag, rng);
  return {
    board: emptyBoard(),
    current: spawn(first.type),
    next: second.type,
    bag: second.bag,
    score: 0,
    lines: 0,
    level: 1,
    status: 'playing',
  };
}

/** Lock the current piece, clear lines, score, and spawn the next piece. */
function lock(state: GameState, piece: Piece, bonus: number, rng: Rng): GameState {
  const { board, cleared } = clearLines(merge(state.board, piece));
  const lines = state.lines + cleared;
  const score = state.score + bonus + LINE_SCORES[cleared] * state.level;
  const level = Math.floor(lines / 10) + 1;
  const current = spawn(state.next);
  const n = takeNext(state.bag, rng);
  const over = collides(board, current);
  return { ...state, board, current, next: n.type, bag: n.bag, score, lines, level, status: over ? 'over' : 'playing' };
}

function tryMove(state: GameState, dx: number, dy: number): GameState | null {
  const moved = { ...state.current, x: state.current.x + dx, y: state.current.y + dy };
  return collides(state.board, moved) ? null : { ...state, current: moved };
}

export function reduce(state: GameState, action: Action, rng: Rng = Math.random): GameState {
  if (action.type === 'restart') return createGame(rng);
  if (action.type === 'togglePause') {
    if (state.status === 'over') return state;
    return { ...state, status: state.status === 'paused' ? 'playing' : 'paused' };
  }
  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'left':
      return tryMove(state, -1, 0) ?? state;
    case 'right':
      return tryMove(state, 1, 0) ?? state;
    case 'down':
    case 'tick': {
      const moved = tryMove(state, 0, 1);
      if (moved) return action.type === 'down' ? { ...moved, score: moved.score + 1 } : moved;
      return lock(state, state.current, 0, rng);
    }
    case 'hardDrop': {
      const y = ghostY(state.board, state.current);
      const dist = y - state.current.y;
      return lock(state, { ...state.current, y }, dist * 2, rng);
    }
    case 'rotate': {
      if (state.current.type === 'O') return state;
      const shape = rotateMatrix(state.current.shape);
      // Simple wall kicks: try in place, then shift left/right.
      for (const dx of [0, -1, 1, -2, 2]) {
        const candidate = { ...state.current, shape, x: state.current.x + dx };
        if (!collides(state.board, candidate)) return { ...state, current: candidate };
      }
      return state;
    }
  }
}
