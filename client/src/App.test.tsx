import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import type { Party, SettlementSummary } from './api/types';

// The WebSocket boundary: App only registers handlers, so a no-op hook is enough.
vi.mock('./hooks/useSocket', () => ({ useSocket: vi.fn() }));

const activeParty: Party = {
  id: 1,
  name: 'Game Night',
  date: '2026-01-01',
  description: null,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  betCount: 3,
  totalWagered: 42
};

const emptySummary: SettlementSummary = {
  partyId: 1,
  partyName: 'Game Night',
  users: [],
  totalPot: 0
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/** Route mocked fetch calls by path so child components get sane responses too. */
function mockApi(parties: Party[] | Error) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/api/parties')) {
      if (parties instanceof Error) throw parties;
      return jsonResponse(parties);
    }
    if (url.includes('/settlement-summary')) return jsonResponse(emptySummary);
    if (url.includes('/api/bets')) return jsonResponse([]);
    return jsonResponse({ error: 'Not found' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows a loading state, then the no-party view when no party is active', async () => {
    const fetchMock = mockApi([{ ...activeParty, status: 'archived' }]);

    render(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(await screen.findByText('No active party found.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Place-A-Bet/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Host/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/parties', expect.anything());
  });

  it('renders the active party and lets the user set a name and switch tabs', async () => {
    mockApi([activeParty]);

    render(<App />);

    expect(await screen.findByText('Game Night')).toBeInTheDocument();
    expect(screen.getByText(/3 bets · \$42 total/)).toBeInTheDocument();
    expect(await screen.findByText(/No open bets yet/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Set Your Name' }));
    fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
      target: { value: 'Alice' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(/Playing as:/)).toBeInTheDocument();
    expect(localStorage.getItem('currentUser')).toBe('Alice');

    fireEvent.click(screen.getByRole('button', { name: 'Closed' }));
    expect(await screen.findByText(/No closed bets waiting to be settled/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
    expect(await screen.findByText(/No settlements yet/)).toBeInTheDocument();
  });

  it('falls back to the no-party view when loading parties fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApi(new Error('Network error'));

    render(<App />);

    expect(await screen.findByText('No active party found.')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith('Error fetching parties:', expect.any(Error));
  });
});
