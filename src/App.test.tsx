// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

const key = (k: string) => act(() => void fireEvent.keyDown(window, { key: k }));

afterEach(cleanup);

describe('<App />', () => {
  it('starts with Enter, scores on hard drop, pauses and restarts', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Tetris' })).toBeTruthy();
    expect(screen.getByLabelText(/Next piece/)).toBeTruthy();

    key('Enter');
    expect(screen.queryByRole('heading', { name: 'Tetris' })).toBeNull();

    key('ArrowLeft');
    key('ArrowUp');
    key('ArrowDown');
    expect(screen.getByTestId('score').textContent).toBe('1');

    key(' ');
    expect(Number(screen.getByTestId('score').textContent)).toBeGreaterThan(1);

    key('p');
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeTruthy();
    key('Escape');
    expect(screen.queryByRole('heading', { name: 'Paused' })).toBeNull();

    key('r');
    expect(screen.getByTestId('score').textContent).toBe('0');
  });

  it('Pause button toggles pause', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeTruthy();
  });
});
