/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFetch } from './useFetch';

function jsonResponse(body: unknown, status = 200, statusText = '') {
  return new Response(JSON.stringify(body), { status, statusText, headers: { 'Content-Type': 'application/json' } });
}

describe('useFetch', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.test');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('starts loading, then exposes the JSON data', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 't1' }]));

    const { result } = renderHook(() => useFetch<{ id: string }[]>('/api/timetables'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: 't1' }]);
    expect(result.current.error).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/timetables');
  });

  it('sends the bearer token and JSON body when given', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    renderHook(() => useFetch('/api/x', { method: 'POST', body: { a: 1 }, token: 'tok' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.body).toBe('{"a":1}');
  });

  it('omits the Authorization header without a token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    renderHook(() => useFetch('/api/x'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('reports the server error message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 401));

    const { result } = renderHook(() => useFetch('/api/x'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Error: Unauthorized');
    expect(result.current.data).toBeNull();
  });

  it('falls back to the status text when the error body has no message', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 500, statusText: 'Internal Server Error' }));

    const { result } = renderHook(() => useFetch('/api/x'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Error: Internal Server Error');
  });

  it('reports network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useFetch('/api/x'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to fetch');
  });

  it('does not fetch when skip is true', () => {
    renderHook(() => useFetch('/api/x', { skip: true }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refetches when the token changes', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({}));
    const { rerender } = renderHook(({ token }) => useFetch('/api/x', { token }), {
      initialProps: { token: null as string | null },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender({ token: 'tok' });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer tok');
  });

  it('aborts the request on unmount', async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() => useFetch('/api/x'));
    await waitFor(() => expect(signal).toBeDefined());
    unmount();

    expect(signal!.aborted).toBe(true);
  });
});
