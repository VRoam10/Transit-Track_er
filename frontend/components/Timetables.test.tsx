/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Timetables from './Timetables';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const timetables = [
  { id: 't-active', enabled: true, createdAt: '2026-11-01T08:00:00Z', timetable: { id: 'B5', cron: '15 8 * * 1' } },
  { id: 't-off', enabled: false, createdAt: '2026-11-02T08:00:00Z', timetable: { id: 'S4', cron: '5 7 * * 3' } },
];

describe('Timetables board', () => {
  const fetchMock = vi.fn();
  const reload = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    reload.mockReset();
    localStorage.setItem('token', 'tok');
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.test');
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('lists timetables with their status', async () => {
    fetchMock.mockResolvedValue(jsonResponse(timetables));
    render(<Timetables />);

    expect(await screen.findByText('t-active')).toBeTruthy();
    expect(screen.getByText('t-off')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Inactive')).toBeTruthy();
  });

  it('shows the empty state', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    render(<Timetables />);

    expect(await screen.findByText('No timetables found')).toBeTruthy();
  });

  it('shows the error state', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 401));
    render(<Timetables />);

    expect(await screen.findByText('Error loading timetables')).toBeTruthy();
    expect(screen.getByText('Error: Unauthorized')).toBeTruthy();
  });

  it('opens the details panel with the raw timetable JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(timetables));
    render(<Timetables />);
    const user = userEvent.setup();

    await user.click(await screen.findByText('t-active'));

    expect(screen.getByText('Timetable Details')).toBeTruthy();
    expect(screen.getByText(/"cron": "15 8 \* \* 1"/)).toBeTruthy();
  });

  it('toggles a timetable with PATCH { enabled: !enabled }', async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'PATCH' ? jsonResponse({}) : jsonResponse(timetables));
    render(<Timetables />);
    const user = userEvent.setup();

    await user.click(await screen.findByTitle('Disable'));

    await waitFor(() => expect(reload).toHaveBeenCalled());
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')!;
    expect(patch[0]).toBe('https://api.test/api/timetables/t-active');
    expect(JSON.parse(patch[1].body)).toEqual({ enabled: false });
    expect(patch[1].headers.Authorization).toBe('Bearer tok');
  });

  it('asks for confirmation before deleting', async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE' ? jsonResponse({}) : jsonResponse(timetables));
    render(<Timetables />);
    const user = userEvent.setup();

    const [firstDelete] = await screen.findAllByTitle('Delete');
    await user.click(firstDelete);
    const dialog = screen.getByText('Delete Timetable?').parentElement!;

    // Cancel closes the dialog without calling the API.
    await user.click(within(dialog).getByText('Cancel'));
    expect(screen.queryByText('Delete Timetable?')).toBeNull();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);

    await user.click(firstDelete);
    await user.click(within(screen.getByText('Delete Timetable?').parentElement!).getByText('Delete'));

    await waitFor(() => expect(reload).toHaveBeenCalled());
    const del = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE')!;
    expect(del[0]).toBe('https://api.test/api/timetables/t-active');
  });
});
