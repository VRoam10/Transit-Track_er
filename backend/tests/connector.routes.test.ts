import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const db = vi.hoisted(() => ({
  connector: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@prisma/client')>();
  return { ...actual, PrismaClient: vi.fn(function () { return db; }) };
});
vi.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => { req.user = { id: 1 }; next(); },
}));

import { Prisma } from '@prisma/client';
import connectorRoutes from '../src/routes/connector/connector.routes';

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/connector', connectorRoutes);
  return a;
}

describe('connector CRUD routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('GET / lists the current user\'s connectors', async () => {
    db.connector.findMany.mockResolvedValue([{ id: 'c1', name: 'TCL Lyon', apiUrl: 'https://x' }]);

    const res = await request(app()).get('/api/connector');

    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('TCL Lyon');
    expect(db.connector.findMany).toHaveBeenCalledWith({ where: { userId: 1 } });
  });

  it('GET /:id is scoped to the current user', async () => {
    db.connector.findUnique.mockResolvedValue({ id: 'c1' });

    await request(app()).get('/api/connector/c1');

    expect(db.connector.findUnique).toHaveBeenCalledWith({ where: { id: 'c1', userId: 1 } });
  });

  it('POST / creates a connector owned by the current user', async () => {
    db.connector.create.mockImplementation(async ({ data }: any) => ({ id: 'c2', ...data }));

    const res = await request(app())
      .post('/api/connector')
      .send({ name: 'Bibus Brest', apiUrl: 'https://bibus.example' });

    expect(res.status).toBe(201);
    expect(db.connector.create).toHaveBeenCalledWith({
      data: { name: 'Bibus Brest', apiUrl: 'https://bibus.example', userId: 1 },
    });
  });

  it('POST / ignores a userId sent in the body', async () => {
    db.connector.create.mockImplementation(async ({ data }: any) => ({ id: 'c2', ...data }));

    await request(app())
      .post('/api/connector')
      .send({ name: 'X', apiUrl: 'https://x', userId: 999 });

    expect(db.connector.create.mock.calls[0][0].data.userId).toBe(1);
  });

  it.each([
    ['name', { apiUrl: 'https://x' }],
    ['apiUrl', { name: 'X' }],
    ['empty name', { name: '', apiUrl: 'https://x' }],
  ])('POST / rejects a missing %s', async (_label, body) => {
    const res = await request(app()).post('/api/connector').send(body);
    expect(res.status).toBe(422);
    expect(db.connector.create).not.toHaveBeenCalled();
  });

  it('POST / returns 500 when the name is already taken', async () => {
    db.connector.create.mockRejectedValue(new Error('Unique constraint failed'));
    const res = await request(app()).post('/api/connector').send({ name: 'X', apiUrl: 'https://x' });
    expect(res.status).toBe(500);
  });

  it('PUT /:id updates a connector scoped to the user', async () => {
    db.connector.update.mockResolvedValue({ id: 'c1', name: 'New', apiUrl: 'https://n' });

    const res = await request(app()).put('/api/connector/c1').send({ name: 'New', apiUrl: 'https://n' });

    expect(res.status).toBe(200);
    expect(db.connector.update).toHaveBeenCalledWith({
      where: { id: 'c1', userId: 1 },
      data: { name: 'New', apiUrl: 'https://n' },
    });
  });

  it('DELETE /:id deletes the connector', async () => {
    db.connector.delete.mockResolvedValue({ id: 'c1' });

    const res = await request(app()).delete('/api/connector/c1');

    expect(res.status).toBe(200);
    expect(db.connector.delete).toHaveBeenCalledWith({ where: { id: 'c1', userId: 1 } });
  });

  it('DELETE /:id returns 404 when Prisma reports the record is missing (P2025)', async () => {
    db.connector.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: 'test' }),
    );

    const res = await request(app()).delete('/api/connector/missing');

    expect(res.status).toBe(404);
  });

  it('DELETE /:id returns 500 for other errors', async () => {
    db.connector.delete.mockRejectedValue(new Error('db down'));
    const res = await request(app()).delete('/api/connector/c1');
    expect(res.status).toBe(500);
  });
});
