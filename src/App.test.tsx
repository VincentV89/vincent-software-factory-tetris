import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders board, next preview and responds to keyboard', () => {
    render(<App />);
    expect(screen.getByTestId('board').children).toHaveLength(200);
    expect(screen.getByTestId('next').dataset.piece).toMatch(/^[IOTSZJL]$/);
    act(() => { fireEvent.keyDown(window, { key: ' ' }); });
    expect(Number(screen.getByTestId('score').textContent)).toBeGreaterThan(0);
    act(() => { fireEvent.keyDown(window, { key: 'p' }); });
    expect(screen.getByRole('status').textContent).toContain('Paused');
    act(() => { fireEvent.keyDown(window, { key: 'r' }); });
    expect(screen.getByTestId('score').textContent).toBe('0');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
