import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectorApi } from './connectorApi';
import { emptyDefinition } from './connectorDefinition';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('connectorApi', () => {
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

  it('listConnectors calls GET /api/connector with the bearer token', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 'c1' }]));

    const result = await connectorApi.listConnectors('tok');

    expect(result).toEqual([{ id: 'c1' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/connector');
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('getResource targets the connector sub-resource', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'r1' }));

    await connectorApi.getResource('c1', 'line', 'tok');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/connector/c1/line');
  });

  it('saveResource sends a PATCH with a JSON body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const body = { name: 'Lines', definition: emptyDefinition(), secrets: { key: 'x' } };

    await connectorApi.saveResource('c1', 'line', body, 'tok');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/connector/c1/line');
    expect(init.method).toBe('PATCH');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual(body);
  });

  it('previewResource POSTs to /preview', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, envelope: { total_count: 0, data: [], pagination: { next: null } } }));

    const result = await connectorApi.previewResource('c1', 'stop', { params: { line: 'A' } }, 'tok');

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/connector/c1/stop/preview');
    expect(init.method).toBe('POST');
  });

  it('deleteResource sends a DELETE', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await connectorApi.deleteResource('c1', 'nxpassage', 'tok');

    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('throws the joined validation errors from a 422 response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ errors: ['request.url is required', 'mapping is empty'] }, 422));

    await expect(connectorApi.getConnector('c1', 'tok')).rejects.toThrow('request.url is required; mapping is empty');
  });

  it('throws the server error message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Connector not found' }, 404));

    await expect(connectorApi.getConnector('c1', 'tok')).rejects.toThrow('Connector not found');
  });

  it('falls back to the status code when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 502 }));

    await expect(connectorApi.listConnectors('tok')).rejects.toThrow('Request failed (502)');
  });

  it('uses relative URLs when NEXT_PUBLIC_API_URL is not set', async () => {
    vi.unstubAllEnvs();
    const previous = process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    fetchMock.mockResolvedValue(jsonResponse([]));

    await connectorApi.listConnectors('tok');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/connector');
    if (previous !== undefined) process.env.NEXT_PUBLIC_API_URL = previous;
  });
});
