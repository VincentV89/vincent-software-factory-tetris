import { describe, expect, it } from 'vitest';
import {
  COLS, ROWS, LINE_SCORES, type Board, type GameState,
  clearLines, collides, createGame, emptyBoard, newBag, reduce, rotateMatrix, spawn, SHAPES,
} from './tetris';

const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };

describe('tetris logic', () => {
  it('7-bag contains each piece exactly once', () => {
    expect([...newBag()].sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
  });

  it('rotates a matrix clockwise', () => {
    expect(rotateMatrix(SHAPES.T)).toEqual([[0, 1, 0], [0, 1, 1], [0, 1, 0]]);
  });

  it('detects wall collisions', () => {
    const b = emptyBoard();
    expect(collides(b, { ...spawn('O'), x: -1 })).toBe(true);
    expect(collides(b, { ...spawn('O'), x: COLS - 1 })).toBe(true);
    expect(collides(b, { ...spawn('O'), y: ROWS - 1 })).toBe(true);
    expect(collides(b, spawn('O'))).toBe(false);
  });

  it('clears full lines and shifts rows down', () => {
    const b: Board = emptyBoard();
    b[ROWS - 1] = Array(COLS).fill('I');
    b[ROWS - 2][0] = 'T';
    const { board, cleared } = clearLines(b);
    expect(cleared).toBe(1);
    expect(board[ROWS - 1][0]).toBe('T');
    expect(board).toHaveLength(ROWS);
  });

  it('moves left/right but not through walls', () => {
    let s = createGame(seq([0]));
    for (let i = 0; i < 20; i++) s = reduce(s, { type: 'left' });
    const cols = s.current.shape.flatMap((row) => row.flatMap((v, c) => (v ? [s.current.x + c] : [])));
    expect(Math.min(...cols)).toBe(0);
  });

  it('hard drop locks the piece, scores, and advances to next piece', () => {
    const s = createGame(seq([0]));
    const next = s.next;
    const after = reduce(s, { type: 'hardDrop' });
    expect(after.current.type).toBe(next);
    expect(after.score).toBeGreaterThan(0);
    expect(after.board.flat().filter(Boolean)).toHaveLength(4);
  });

  it('scores line clears by level', () => {
    const s = createGame(seq([0]));
    const board = emptyBoard();
    // Fill bottom row except where a vertical I would land: use an O in cols 4-5 instead.
    board[ROWS - 1] = Array(COLS).fill('L');
    board[ROWS - 1][4] = null; board[ROWS - 1][5] = null;
    const state: GameState = { ...s, board, current: { ...spawn('O') }, level: 2 };
    const after = reduce(state, { type: 'hardDrop' });
    expect(after.lines).toBe(1);
    expect(after.score).toBe((ROWS - 2) * 2 + LINE_SCORES[1] * 2);
  });

  it('pause blocks movement and gravity; restart resets', () => {
    let s = createGame(seq([0]));
    s = reduce(s, { type: 'togglePause' });
    expect(s.status).toBe('paused');
    const y = s.current.y;
    s = reduce(s, { type: 'tick' });
    expect(s.current.y).toBe(y);
    s = reduce(s, { type: 'togglePause' });
    expect(s.status).toBe('playing');
    s = reduce(s, { type: 'hardDrop' });
    s = reduce(s, { type: 'restart' });
    expect(s.score).toBe(0);
    expect(s.board.flat().every((c) => c === null)).toBe(true);
  });

  it('ends the game when a new piece cannot spawn', () => {
    const s = createGame(seq([0]));
    const board = emptyBoard().map((row, y) => (y < 2 ? row : row.map((_, x) => (x === 0 ? null : 'Z' as const))));
    const after = reduce({ ...s, board }, { type: 'hardDrop' });
    expect(after.status).toBe('over');
    expect(reduce(after, { type: 'left' })).toBe(after);
  });
});
