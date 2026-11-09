import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(function () { return db; }) }));
vi.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 1, name: 'Alice', email: 'alice@example.com', token: 'fcm-token' };
    next();
  },
}));
const sendNotification = vi.hoisted(() => vi.fn());
vi.mock('../src/services/firebase.services', () => ({ sendNotification }));

import userRoutes from '../src/routes/users.routes';

const SECRET = 'test-secret';

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/users', userRoutes);
  return a;
}

describe('POST /api/users (register)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('creates the user with a hashed password and returns its id', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockImplementation(async ({ data }: any) => ({ id: 5, ...data }));

    const res = await request(app())
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ user: 5 });
    const data = db.user.create.mock.calls[0][0].data;
    expect(data.name).toBe('Alice');
    expect(data.email).toBe('alice@example.com');
    expect(data.password).not.toBe('secret123');
    expect(await bcrypt.compare('secret123', data.password)).toBe(true);
  });

  it('rejects an email that is already registered', async () => {
    db.user.findUnique.mockResolvedValue({ id: 1, email: 'alice@example.com' });

    const res = await request(app())
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });

    expect(res.status).toBe(422);
    expect(res.body.errors.map((e: any) => e.msg)).toContain('email already in use');
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid email, a short name and a missing password', async () => {
    db.user.findUnique.mockResolvedValue(null);

    const res = await request(app()).post('/api/users').send({ name: 'Al', email: 'not-an-email' });

    expect(res.status).toBe(422);
    const fields = res.body.errors.map((e: any) => e.path);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
    expect(db.user.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/users/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = SECRET;
  });

  it('returns a JWT containing the user id and email for valid credentials', async () => {
    const password = await bcrypt.hash('secret123', 4);
    db.user.findUnique.mockResolvedValue({ id: 3, email: 'bob@example.com', password });

    const res = await request(app())
      .post('/api/users/login')
      .send({ email: 'bob@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    const payload = jwt.verify(res.body.token, SECRET) as any;
    expect(payload.userId).toBe(3);
    expect(payload.email).toBe('bob@example.com');
  });

  it('returns 401 for a wrong password', async () => {
    const password = await bcrypt.hash('secret123', 4);
    db.user.findUnique.mockResolvedValue({ id: 3, email: 'bob@example.com', password });

    const res = await request(app())
      .post('/api/users/login')
      .send({ email: 'bob@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it('returns 401 for an unknown email', async () => {
    db.user.findUnique.mockResolvedValue(null);

    const res = await request(app())
      .post('/api/users/login')
      .send({ email: 'nobody@example.com', password: 'x' });

    expect(res.status).toBe(401);
  });

  it('uses JWT_EXPIRES_IN for the token lifetime', async () => {
    process.env.JWT_EXPIRES_IN = '2h';
    const password = await bcrypt.hash('pw', 4);
    db.user.findUnique.mockResolvedValue({ id: 3, email: 'bob@example.com', password });

    const res = await request(app()).post('/api/users/login').send({ email: 'bob@example.com', password: 'pw' });

    const payload = jwt.verify(res.body.token, SECRET) as any;
    expect(payload.exp - payload.iat).toBe(2 * 60 * 60);
    delete process.env.JWT_EXPIRES_IN;
  });
});

describe('authenticated user routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET / never selects password hashes or push tokens', async () => {
    db.user.findMany.mockResolvedValue([{ id: 1, name: 'Alice', email: 'alice@example.com' }]);

    const res = await request(app()).get('/api/users');

    expect(res.status).toBe(200);
    const select = db.user.findMany.mock.calls[0][0].select;
    expect(select).toEqual({ id: true, name: true, email: true, createdAt: true });
    expect(select.password).toBeUndefined();
    expect(select.token).toBeUndefined();
  });

  it('GET / returns 500 when the database fails', async () => {
    db.user.findMany.mockRejectedValue(new Error('db down'));
    const res = await request(app()).get('/api/users');
    expect(res.status).toBe(500);
  });

  it('POST /register-token stores the FCM token on the current user', async () => {
    db.user.update.mockResolvedValue({});

    const res = await request(app()).post('/api/users/register-token').send({ token: 'new-fcm' });

    expect(res.status).toBe(200);
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { token: 'new-fcm' } });
  });

  it('POST /register-token returns 500 when the update fails', async () => {
    db.user.update.mockRejectedValue(new Error('db down'));

    const res = await request(app()).post('/api/users/register-token').send({ token: 'x' });

    expect(res.status).toBe(500);
  });

  it('GET /me returns the current user without the password or token', async () => {
    const res = await request(app()).get('/api/users/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, name: 'Alice', email: 'alice@example.com' });
  });
});
