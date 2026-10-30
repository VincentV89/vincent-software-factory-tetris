import { useCallback, useEffect, useReducer } from 'react';
import * as T from './game/tetris';

export type Action =
  | { type: 'start' }
  | { type: 'restart'; seed: number }
  | { type: 'pause' }
  | { type: 'move'; dx: number }
  | { type: 'rotate'; dir: 1 | -1 }
  | { type: 'softDrop' }
  | { type: 'hardDrop' }
  | { type: 'tick' };

export function reducer(state: T.GameState, action: Action): T.GameState {
  switch (action.type) {
    case 'start':
      return T.start(state);
    case 'restart':
      return T.restart(action.seed);
    case 'pause':
      return T.togglePause(state);
    case 'move':
      return T.move(state, action.dx);
    case 'rotate':
      return T.rotate(state, action.dir);
    case 'softDrop':
      return T.softDrop(state);
    case 'hardDrop':
      return T.hardDrop(state);
    case 'tick':
      return T.tick(state);
  }
}

export function useTetris() {
  const [state, dispatch] = useReducer(reducer, undefined, () => T.createGame(Date.now()));

  // Gravity
  useEffect(() => {
    if (state.status !== 'playing') return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), T.dropInterval(state.level));
    return () => window.clearInterval(id);
  }, [state.status, state.level]);

  const restart = useCallback(() => dispatch({ type: 'restart', seed: Date.now() }), []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      let action: Action | null = null;
      switch (key) {
        case 'ArrowLeft':
        case 'a':
          action = { type: 'move', dx: -1 };
          break;
        case 'ArrowRight':
        case 'd':
          action = { type: 'move', dx: 1 };
          break;
        case 'ArrowDown':
        case 's':
          action = { type: 'softDrop' };
          break;
        case 'ArrowUp':
        case 'x':
        case 'w':
          action = { type: 'rotate', dir: 1 };
          break;
        case 'z':
          action = { type: 'rotate', dir: -1 };
          break;
        case ' ':
          action = { type: 'hardDrop' };
          break;
        case 'p':
        case 'Escape':
          action = { type: 'pause' };
          break;
        case 'r':
          if (e.repeat) return;
          action = { type: 'restart', seed: Date.now() };
          break;
        case 'Enter':
          action = { type: 'start' };
          break;
      }
      if (!action) return;
      e.preventDefault();
      // Prevent Space/Enter from also "clicking" a focused button.
      if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
      if ((action.type === 'pause' || action.type === 'hardDrop') && e.repeat) return;
      dispatch(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Auto-pause when the tab loses focus
  useEffect(() => {
    const onBlur = () => {
      if (state.status === 'playing') dispatch({ type: 'pause' });
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [state.status]);

  return { state, dispatch, restart };
}
