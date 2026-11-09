import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const db = vi.hoisted(() => ({
  savedTimetable: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(function () { return db; }) }));
vi.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => { req.user = { id: 1 }; next(); },
}));

import timetablesRoutes from '../src/routes/timetables.routes';

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/timetables', timetablesRoutes);
  return a;
}

const timetable = { id: 'B5', api: 'data.explore.star.fr', cron: '15 8 * * 1', mode: 'metro' };

describe('timetables routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('GET / lists only the current user\'s timetables', async () => {
    db.savedTimetable.findMany.mockResolvedValue([{ id: 't1', timetable }]);

    const res = await request(app()).get('/api/timetables');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(db.savedTimetable.findMany).toHaveBeenCalledWith({ where: { userId: 1 } });
  });

  it('GET / returns 500 when the database fails', async () => {
    db.savedTimetable.findMany.mockRejectedValue(new Error('db down'));
    const res = await request(app()).get('/api/timetables');
    expect(res.status).toBe(500);
  });

  it('GET /:id returns the timetable scoped to the user', async () => {
    db.savedTimetable.findUnique.mockResolvedValue({ id: 't1', timetable });

    const res = await request(app()).get('/api/timetables/t1');

    expect(res.status).toBe(200);
    expect(db.savedTimetable.findUnique).toHaveBeenCalledWith({ where: { id: 't1', userId: 1 } });
  });

  it('GET /:id returns 404 when it does not exist', async () => {
    db.savedTimetable.findUnique.mockResolvedValue(null);
    const res = await request(app()).get('/api/timetables/missing');
    expect(res.status).toBe(404);
  });

  it('POST / creates a timetable for the current user', async () => {
    db.savedTimetable.create.mockImplementation(async ({ data }: any) => ({ id: 'new', enabled: true, ...data }));

    const res = await request(app()).post('/api/timetables').send({ timetable });

    expect(res.status).toBe(201);
    expect(db.savedTimetable.create).toHaveBeenCalledWith({ data: { timetable, userId: 1 } });
    expect(res.body.id).toBe('new');
  });

  it.each([
    ['cron', { ...timetable, cron: '' }],
    ['api', { ...timetable, api: undefined }],
    ['id', { ...timetable, id: '' }],
    ['mode', { ...timetable, mode: undefined }],
  ])('POST / rejects a timetable without a valid %s', async (_field, bad) => {
    const res = await request(app()).post('/api/timetables').send({ timetable: bad });
    expect(res.status).toBe(422);
    expect(db.savedTimetable.create).not.toHaveBeenCalled();
  });

  it('POST / rejects a body without a timetable object', async () => {
    const res = await request(app()).post('/api/timetables').send({ timetable: 'nope' });
    expect(res.status).toBe(422);
  });

  it('PATCH /:id toggles enabled', async () => {
    db.savedTimetable.update.mockResolvedValue({ id: 't1', enabled: false, timetable });

    const res = await request(app()).patch('/api/timetables/t1').send({ enabled: false });

    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
    expect(db.savedTimetable.update).toHaveBeenCalledWith({
      where: { id: 't1', userId: 1 },
      data: { enabled: false },
    });
  });

  it('PATCH /:id rejects a non-boolean enabled', async () => {
    const res = await request(app()).patch('/api/timetables/t1').send({ enabled: 'yes' });
    expect(res.status).toBe(400);
    expect(db.savedTimetable.update).not.toHaveBeenCalled();
  });

  it('DELETE /:id deletes the user\'s timetable', async () => {
    db.savedTimetable.delete.mockResolvedValue({ id: 't1' });

    const res = await request(app()).delete('/api/timetables/t1');

    expect(res.status).toBe(200);
    expect(db.savedTimetable.delete).toHaveBeenCalledWith({ where: { id: 't1', userId: 1 } });
  });

  it('DELETE /:id returns 500 when the timetable cannot be deleted', async () => {
    db.savedTimetable.delete.mockRejectedValue(new Error('not found'));
    const res = await request(app()).delete('/api/timetables/t1');
    expect(res.status).toBe(500);
  });
});
