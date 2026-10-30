import type { ReactNode } from 'react';
import { COLS, ROWS, SHAPES, ghostY, type Cell, type PieceType } from './game/tetris';
import { useTetris } from './useTetris';

function renderBoard(state: ReturnType<typeof useTetris>['state']) {
  const cells: { type: Cell; ghost: boolean }[][] = state.board.map((row) =>
    row.map((type) => ({ type, ghost: false })),
  );
  const p = state.current;
  if (p) {
    const gy = ghostY(state.board, p);
    const paint = (y0: number, ghost: boolean) =>
      p.shape.forEach((row, r) =>
        row.forEach((v, c) => {
          const y = y0 + r;
          const x = p.x + c;
          if (v && y >= 0 && y < ROWS && x >= 0 && x < COLS) cells[y][x] = { type: p.type, ghost };
        }),
      );
    if (state.status !== 'ready') paint(gy, true);
    paint(p.y, false);
  }
  return cells;
}

function Preview({ type }: { type: PieceType }) {
  // Trim empty rows so the preview is centered nicely.
  const shape = SHAPES[type].filter((row) => row.some(Boolean));
  return (
    <div
      className="preview"
      style={{ gridTemplateColumns: `repeat(${shape[0].length}, var(--cell))` }}
      aria-label={`Next piece: ${type}`}
    >
      {shape.flatMap((row, r) =>
        row.map((v, c) => <div key={`${r}-${c}`} className={v ? `cell ${type}` : 'cell empty-preview'} />),
      )}
    </div>
  );
}

export default function App() {
  const { state, dispatch, restart } = useTetris();
  const cells = renderBoard(state);

  let overlay: ReactNode = null;
  if (state.status === 'ready') {
    overlay = (
      <>
        <h2>Tetris</h2>
        <button onClick={() => dispatch({ type: 'start' })}>Start</button>
        <p>or press Enter</p>
      </>
    );
  } else if (state.status === 'paused') {
    overlay = (
      <>
        <h2>Paused</h2>
        <button onClick={() => dispatch({ type: 'pause' })}>Resume</button>
        <p>press P or Esc to resume</p>
      </>
    );
  } else if (state.status === 'over') {
    overlay = (
      <>
        <h2>Game Over</h2>
        <p>Score: {state.score}</p>
        <button onClick={restart}>Play again</button>
        <p>or press R</p>
      </>
    );
  }

  return (
    <main className="app">
      <div className="board-wrap">
        <div className="board" style={{ gridTemplateColumns: `repeat(${COLS}, var(--cell))` }}>
          {cells.flatMap((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${y}-${x}`}
                className={`cell ${cell.type ?? ''} ${cell.ghost ? 'ghost' : ''}`}
              />
            )),
          )}
        </div>
        {overlay && <div className="overlay">{overlay}</div>}
      </div>

      <aside className="side">
        <section className="panel">
          <h3>Next</h3>
          <Preview type={state.next} />
        </section>
        <section className="panel stats">
          <div>
            <span>Score</span>
            <strong data-testid="score">{state.score}</strong>
          </div>
          <div>
            <span>Lines</span>
            <strong>{state.lines}</strong>
          </div>
          <div>
            <span>Level</span>
            <strong>{state.level}</strong>
          </div>
        </section>
        <section className="panel buttons">
          <button
            onClick={() => dispatch({ type: 'pause' })}
            disabled={state.status !== 'playing' && state.status !== 'paused'}
          >
            {state.status === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button onClick={restart}>Restart</button>
        </section>
        <section className="panel help">
          <h3>Controls</h3>
          <ul>
            <li><kbd>←</kbd> <kbd>→</kbd> Move</li>
            <li><kbd>↓</kbd> Soft drop</li>
            <li><kbd>↑</kbd> / <kbd>X</kbd> Rotate ↻</li>
            <li><kbd>Z</kbd> Rotate ↺</li>
            <li><kbd>Space</kbd> Hard drop</li>
            <li><kbd>P</kbd> / <kbd>Esc</kbd> Pause</li>
            <li><kbd>R</kbd> Restart</li>
          </ul>
        </section>
      </aside>
    </main>
  );
}
