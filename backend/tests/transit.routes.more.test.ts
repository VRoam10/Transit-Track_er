import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const axiosGet = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({ default: { get: axiosGet } }));

import busLines from '../src/routes/bus/lines.routes';
import busDirections from '../src/routes/bus/directions.routes';
import metroDirections from '../src/routes/metro/directions.routes';
import metroNextPassages from '../src/routes/metro/nextpassages.routes';
import metroStops from '../src/routes/metro/stops.routes';

function app() {
  const a = express();
  a.use('/api/bus/lines', busLines);
  a.use('/api/bus/directions', busDirections);
  a.use('/api/metro/directions', metroDirections);
  a.use('/api/metro/nextpassages', metroNextPassages);
  a.use('/api/metro/stops', metroStops);
  return a;
}

describe('remaining transit routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /api/bus/lines maps STAR lines', async () => {
    axiosGet.mockResolvedValue({ data: { total_count: 1, results: [{ id: '0001', nomcourt: 'C1', couleurligne: '#E2001A' }] } });

    const res = await request(app()).get('/api/bus/lines');

    expect(res.body).toEqual({ total_count: 1, data: [{ id: '0001', name: 'C1', color: '#E2001A' }] });
  });

  it.each(['bus', 'metro'])('GET /api/%s/directions maps the main routes', async (mode) => {
    axiosGet.mockResolvedValue({
      data: { total_count: 2, results: [
        { sens: 0, nomarretarrivee: 'La Poterie', id: 'P0' },
        { sens: 1, nomarretarrivee: 'J.F. Kennedy', id: 'P1' },
      ] },
    });

    const res = await request(app()).get(`/api/${mode}/directions/a`);

    expect(res.body.data).toEqual([
      { id: 0, name: 'La Poterie', parcoursId: 'P0' },
      { id: 1, name: 'J.F. Kennedy', parcoursId: 'P1' },
    ]);
    expect(axiosGet.mock.calls[0][0]).toContain(`tco-${mode}-topologie-parcours-td`);
  });

  it('GET /api/metro/nextpassages/:id returns the first passage', async () => {
    axiosGet.mockResolvedValue({
      data: { total_count: 2, results: [{
        idjdd: 'A5', idligne: 'a', nomarret: 'République', sens: 0,
        arriveefirsttrain: '2026-11-09T09:44:00+01:00', coordonnees: { lon: -1.67, lat: 48.11 },
        heureextraction: '2026-11-09T09:40:00+01:00',
      }] },
    });

    const res = await request(app()).get('/api/metro/nextpassages/A5');

    expect(res.body.total_count).toBe(1);
    expect(res.body.data).toMatchObject({ id: 'A5', lineId: 'a', name: 'République', nextTrain: '2026-11-09T09:44:00+01:00' });
  });

  it('GET /api/metro/stops returns 404 for an unknown direction', async () => {
    axiosGet.mockResolvedValueOnce({ data: { total_count: 1, results: [{ sens: 0, nomarretarrivee: 'La Poterie', id: 'P0' }] } });

    const res = await request(app()).get('/api/metro/stops/a/5');

    expect(res.status).toBe(404);
  });

  it.each([
    ['/api/bus/lines'],
    ['/api/bus/directions/0001'],
    ['/api/metro/directions/a'],
    ['/api/metro/nextpassages/A5'],
    ['/api/metro/stops/a/0'],
  ])('%s answers 502 when STAR is down', async (url) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    axiosGet.mockRejectedValue(new Error('ECONNRESET'));

    const res = await request(app()).get(url).timeout(2000);

    expect(res.status).toBe(502);
  });
});
