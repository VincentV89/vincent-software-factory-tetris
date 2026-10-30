import { useEffect, useReducer } from 'react';
import {
  type Action,
  type Board,
  type GameState,
  COLS,
  SHAPES,
  createGame,
  dropInterval,
  ghostY,
  reduce,
} from './game/tetris';

const KEY_ACTIONS: Record<string, Action> = {
  ArrowLeft: { type: 'left' },
  ArrowRight: { type: 'right' },
  ArrowDown: { type: 'down' },
  ArrowUp: { type: 'rotate' },
  x: { type: 'rotate' },
  X: { type: 'rotate' },
  ' ': { type: 'hardDrop' },
  p: { type: 'togglePause' },
  P: { type: 'togglePause' },
  Escape: { type: 'togglePause' },
  r: { type: 'restart' },
  R: { type: 'restart' },
};

function reducer(state: GameState, action: Action): GameState {
  return reduce(state, action);
}

/** Board with the ghost and the active piece drawn on top. */
function renderBoard(state: GameState): { cells: Board; ghost: boolean[][] } {
  const cells = state.board.map((row) => [...row]);
  const ghost = cells.map((row) => row.map(() => false));
  const { current } = state;
  const gy = ghostY(state.board, current);
  current.shape.forEach((row, r) =>
    row.forEach((v, c) => {
      if (!v) return;
      const x = current.x + c;
      if (gy + r >= 0) ghost[gy + r][x] = true;
      if (current.y + r >= 0) cells[current.y + r][x] = current.type;
    }),
  );
  return { cells, ghost };
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createGame());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = KEY_ACTIONS[e.key];
      if (!action) return;
      e.preventDefault();
      dispatch(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (state.status !== 'playing') return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), dropInterval(state.level));
    return () => window.clearInterval(id);
  }, [state.status, state.level]);

  const { cells, ghost } = renderBoard(state);
  const nextShape = SHAPES[state.next];

  return (
    <main className="app">
      <h1>Tetris</h1>
      <div className="layout">
        <div className="board-wrap">
          <div className="board" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }} data-testid="board">
            {cells.flatMap((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${y}-${x}`}
                  className={`cell ${cell ? `filled p-${cell}` : ghost[y][x] ? 'ghost' : ''}`}
                />
              )),
            )}
          </div>
          {state.status !== 'playing' && (
            <div className="overlay" role="status">
              {state.status === 'paused' ? (
                <>
                  <h2>Paused</h2>
                  <p>Press P to resume</p>
                </>
              ) : (
                <>
                  <h2>Game Over</h2>
                  <p>Final score: {state.score}</p>
                  <p>Press R to restart</p>
                </>
              )}
            </div>
          )}
        </div>

        <aside className="side">
          <section className="panel">
            <h3>Next</h3>
            <div
              className="preview"
              data-testid="next"
              data-piece={state.next}
              style={{ gridTemplateColumns: `repeat(${nextShape[0].length}, 1fr)` }}
            >
              {nextShape.flatMap((row, r) =>
                row.map((v, c) => <div key={`${r}-${c}`} className={`cell ${v ? `filled p-${state.next}` : 'blank'}`} />),
              )}
            </div>
          </section>
          <section className="panel stats">
            <div>
              <span>Score</span>
              <strong data-testid="score">{state.score}</strong>
            </div>
            <div>
              <span>Lines</span>
              <strong data-testid="lines">{state.lines}</strong>
            </div>
            <div>
              <span>Level</span>
              <strong data-testid="level">{state.level}</strong>
            </div>
          </section>
          <section className="panel buttons">
            <button type="button" onClick={() => dispatch({ type: 'togglePause' })} disabled={state.status === 'over'}>
              {state.status === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button type="button" onClick={() => dispatch({ type: 'restart' })}>
              Restart
            </button>
          </section>
          <section className="panel help">
            <h3>Controls</h3>
            <ul>
              <li><kbd>←</kbd> <kbd>→</kbd> Move</li>
              <li><kbd>↑</kbd> / <kbd>X</kbd> Rotate</li>
              <li><kbd>↓</kbd> Soft drop</li>
              <li><kbd>Space</kbd> Hard drop</li>
              <li><kbd>P</kbd> / <kbd>Esc</kbd> Pause</li>
              <li><kbd>R</kbd> Restart</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
