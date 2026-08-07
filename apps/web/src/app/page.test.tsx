import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('renderiza o headline principal e a CTA', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /estilo que não segue tendência/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explorar coleção/i })).toBeInTheDocument();
  });
});
