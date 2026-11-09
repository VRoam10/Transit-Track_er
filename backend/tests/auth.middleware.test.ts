import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));
vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(function () { return db; }) }));

import { authenticateToken } from '../src/middleware/auth';

const SECRET = 'test-secret';

function app() {
  const a = express();
  a.get('/private', authenticateToken, (req, res) => {
    res.json({ userId: req.user?.id });
  });
  return a;
}

describe('authenticateToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = SECRET;
  });

  it('returns 401 when no Authorization header is sent', async () => {
    const res = await request(app()).get('/private');
    expect(res.status).toBe(401);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 when the header has no token after "Bearer"', async () => {
    const res = await request(app()).get('/private').set('Authorization', 'Bearer');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a token signed with another secret', async () => {
    const token = jwt.sign({ userId: 1 }, 'other-secret');
    const res = await request(app()).get('/private').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns 403 for an expired token', async () => {
    const token = jwt.sign({ userId: 1, exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    const res = await request(app()).get('/private').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 when the user in the token no longer exists', async () => {
    db.user.findUnique.mockResolvedValue(null);
    const token = jwt.sign({ userId: 42 }, SECRET);
    const res = await request(app()).get('/private').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: 42 } });
  });

  it('attaches the user and calls the next handler for a valid token', async () => {
    db.user.findUnique.mockResolvedValue({ id: 7, email: 'a@b.fr' });
    const token = jwt.sign({ userId: 7 }, SECRET);
    const res = await request(app()).get('/private').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 7 });
  });
});
