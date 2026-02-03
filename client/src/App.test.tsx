import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock fetch
global.fetch = vi.fn();

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the app title', () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ message: 'API is working!' })
    });

    render(<App />);
    expect(screen.getByText('🎲 Place-A-Bet')).toBeInTheDocument();
    expect(screen.getByText('A simple betting app for parties and events')).toBeInTheDocument();
  });

  it('displays API status when connection succeeds', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ message: 'API is working!' })
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/API is working!/)).toBeInTheDocument();
    });
  });

  it('displays error message when API connection fails', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/API connection failed/)).toBeInTheDocument();
    });
  });
});
