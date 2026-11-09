import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const axiosGet = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({ default: { get: axiosGet } }));

import metroLines from '../src/routes/metro/lines.routes';
import busNextPassages from '../src/routes/bus/nextpassages.routes';
import busStops from '../src/routes/bus/stops.routes';

function app() {
  const a = express();
  a.use('/api/metro/lines', metroLines);
  a.use('/api/bus/nextpassages', busNextPassages);
  a.use('/api/bus/stops', busStops);
  return a;
}

describe('GET /api/metro/lines', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps STAR records to { id, name, color }', async () => {
    axiosGet.mockResolvedValue({
      data: {
        total_count: 2,
        results: [
          { id: 'a', nomcourt: 'a', couleurligne: '#E3051B' },
          { id: 'b', nomcourt: 'b', couleurligne: '#00893E' },
        ],
      },
    });

    const res = await request(app()).get('/api/metro/lines');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total_count: 2,
      data: [
        { id: 'a', name: 'a', color: '#E3051B' },
        { id: 'b', name: 'b', color: '#00893E' },
      ],
    });
  });

  it('turns ?pages=N into an offset of N * 50', async () => {
    axiosGet.mockResolvedValue({ data: { total_count: 0, results: [] } });

    await request(app()).get('/api/metro/lines?pages=2');

    expect(axiosGet.mock.calls[0][0]).toContain('offset=100');
  });

  it('falls back to offset 0 for a non-numeric page', async () => {
    axiosGet.mockResolvedValue({ data: { total_count: 0, results: [] } });

    await request(app()).get('/api/metro/lines?pages=abc');

    expect(axiosGet.mock.calls[0][0]).toContain('offset=0');
  });
});

describe('GET /api/bus/nextpassages/:line-:direction-:stop', () => {
  beforeEach(() => vi.clearAllMocks());

  const passage = {
    idligne: '0001',
    nomarret: 'République',
    sens: 0,
    arrivee: '2026-11-09T10:00:00+01:00',
    coordonnees: { lon: -1.67, lat: 48.11 },
    heureextraction: '2026-11-09T09:55:00+01:00',
  };

  it('returns the first passage for the requested direction', async () => {
    axiosGet.mockResolvedValue({ data: { total_count: 3, results: [passage] } });

    const res = await request(app()).get('/api/bus/nextpassages/0001-0-1234');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total_count: 1,
      data: {
        id: '0001-0-1234',
        lineId: '0001',
        name: 'République',
        direction: 0,
        nextTrain: passage.arrivee,
        coordonnees: passage.coordonnees,
        extraction: passage.heureextraction,
      },
    });
    const url = axiosGet.mock.calls[0][0];
    expect(url).toContain('idarret%3A1234');
    expect(url).toContain('idligne%3A%220001%22');
  });

  it('returns no data when the next passage goes the other way', async () => {
    axiosGet.mockResolvedValue({ data: { total_count: 1, results: [{ ...passage, sens: 1 }] } });

    const res = await request(app()).get('/api/bus/nextpassages/0001-0-1234');

    expect(res.body).toEqual({ total_count: 0, data: null });
  });

  it('returns no data when there are no passages', async () => {
    axiosGet.mockResolvedValue({ data: { total_count: 0, results: [] } });

    const res = await request(app()).get('/api/bus/nextpassages/0001-0-1234');

    expect(res.body).toEqual({ total_count: 0, data: null });
  });
});

describe('GET /api/bus/stops/:idLigne/:sens', () => {
  beforeEach(() => vi.clearAllMocks());

  const directions = {
    data: {
      total_count: 2,
      results: [
        { sens: 0, nomarretarrivee: 'Chantepie', id: 'P0' },
        { sens: 1, nomarretarrivee: 'Saint-Laurent', id: 'P1' },
      ],
    },
  };

  it('lists the stops of the direction\'s main route in order', async () => {
    axiosGet
      .mockResolvedValueOnce(directions)
      .mockResolvedValueOnce({
        data: {
          total_count: 2,
          results: [
            { idarret: '100', nomarret: 'Saint-Laurent', ordre: 1 },
            { idarret: '101', nomarret: 'Gast', ordre: 2 },
          ],
        },
      });

    const res = await request(app()).get('/api/bus/stops/0001/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total_count: 2,
      data: [
        { id: '0001-1-100', name: 'Saint-Laurent', direction: 1, order: 1 },
        { id: '0001-1-101', name: 'Gast', direction: 1, order: 2 },
      ],
    });
    expect(axiosGet.mock.calls[1][0]).toContain('idparcours%3A%22P1%22');
  });

  it('returns 404 for a direction the line does not have', async () => {
    axiosGet.mockResolvedValueOnce(directions);

    const res = await request(app()).get('/api/bus/stops/0001/7');

    expect(res.status).toBe(404);
    expect(axiosGet).toHaveBeenCalledTimes(1);
  });
});
