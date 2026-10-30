import { describe, expect, it } from 'vitest';
import {
  COLS,
  ROWS,
  SHAPES,
  clearLines,
  collides,
  createBoard,
  createGame,
  hardDrop,
  move,
  restart,
  rotate,
  rotateMatrix,
  shuffledBag,
  softDrop,
  start,
  tick,
  togglePause,
  type GameState,
  type PieceType,
} from './tetris';

const playing = (seed = 1): GameState => start(createGame(seed));

describe('board & collision', () => {
  it('creates an empty board of the right size', () => {
    const b = createBoard();
    expect(b).toHaveLength(ROWS);
    expect(b.every((r) => r.length === COLS && r.every((c) => c === null))).toBe(true);
  });

  it('detects walls and floor', () => {
    const b = createBoard();
    expect(collides(b, SHAPES.O, -1, 0)).toBe(true);
    expect(collides(b, SHAPES.O, COLS - 1, 0)).toBe(true);
    expect(collides(b, SHAPES.O, 0, ROWS - 1)).toBe(true);
    expect(collides(b, SHAPES.O, 0, ROWS - 2)).toBe(false);
  });
});

describe('rotation', () => {
  it('rotates clockwise and back', () => {
    const r = rotateMatrix(SHAPES.T, 1);
    expect(r).toEqual([
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ]);
    expect(rotateMatrix(r, -1)).toEqual(SHAPES.T);
  });

  it('four rotations return to the original', () => {
    let m = SHAPES.L;
    for (let i = 0; i < 4; i++) m = rotateMatrix(m, 1);
    expect(m).toEqual(SHAPES.L);
  });
});

describe('7-bag randomizer', () => {
  it('contains each piece exactly once', () => {
    const [bag] = shuffledBag(42);
    expect([...bag].sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
  });
});

describe('line clearing', () => {
  it('clears full rows and shifts down', () => {
    const b = createBoard();
    b[ROWS - 1] = Array<PieceType>(COLS).fill('I');
    b[ROWS - 2][0] = 'T';
    const [out, cleared] = clearLines(b);
    expect(cleared).toBe(1);
    expect(out[ROWS - 1][0]).toBe('T');
    expect(out[0].every((c) => c === null)).toBe(true);
  });
});

describe('game actions', () => {
  it('does nothing until started', () => {
    const g = createGame(1);
    expect(move(g, 1)).toBe(g);
    expect(tick(g)).toBe(g);
  });

  it('moves and is blocked by walls', () => {
    let g = playing();
    for (let i = 0; i < 20; i++) g = move(g, -1);
    expect(collides(g.board, g.current!.shape, g.current!.x - 1, g.current!.y)).toBe(true);
  });

  it('rotate changes the shape (non-O)', () => {
    let g = playing();
    while (g.current!.type === 'O') g = hardDrop(g);
    const r = rotate(g);
    expect(r.current!.shape).not.toEqual(g.current!.shape);
  });

  it('soft drop awards 1 point per cell', () => {
    const g = softDrop(playing());
    expect(g.score).toBe(1);
  });

  it('hard drop locks the piece and spawns the next', () => {
    const g = playing();
    const nextType = g.next;
    const d = hardDrop(g);
    expect(d.current!.type).toBe(nextType);
    expect(d.board.flat().filter(Boolean)).toHaveLength(4);
    expect(d.score).toBeGreaterThan(0);
  });

  it('scores line clears by level', () => {
    let g = playing();
    const board = createBoard();
    // Fill the bottom row except the 4 cells an I-piece will fill when dropped flat.
    for (let x = 0; x < COLS; x++) board[ROWS - 1][x] = 'J';
    g = { ...g, board, current: { type: 'I', shape: SHAPES.I, x: 3, y: -1 } };
    for (let x = 3; x < 7; x++) g.board[ROWS - 1][x] = null;
    const d = hardDrop(g);
    expect(d.lines).toBe(1);
    expect(d.score).toBe(100 + (ROWS - 1) * 2);
  });

  it('pauses and resumes', () => {
    const g = togglePause(playing());
    expect(g.status).toBe('paused');
    expect(tick(g)).toBe(g);
    expect(togglePause(g).status).toBe('playing');
  });

  it('ends the game when pieces stack to the top', () => {
    let g = playing(7);
    for (let i = 0; i < 100 && g.status === 'playing'; i++) g = hardDrop(g);
    expect(g.status).toBe('over');
    expect(g.current).toBeNull();
  });

  it('restart resets the game', () => {
    const g = restart(3);
    expect(g.status).toBe('playing');
    expect(g.score).toBe(0);
    expect(g.board.flat().every((c) => c === null)).toBe(true);
  });
});
