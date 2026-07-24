import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    connectorResource: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => { req.user = { id: 1 }; next(); },
}));

import { prisma } from '../src/lib/prisma';
import { validateDefinition, requiredParams, createConnectorResourceRouter } from '../src/routes/connector/resource.routes';

process.env.CONNECTOR_SECRET_KEY = Buffer.alloc(32, 3).toString('base64');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/connector/:connectorId', createConnectorResourceRouter());
  return a;
}

const goodDef = {
  request: { method: 'GET', url: 'https://api.x.com/l', pagination: { style: 'none' } },
  response: { format: 'json', rootPath: 'data' },
  mapping: { fields: [{ target: 'id', source: 'lid' }] },
};

describe('validateDefinition', () => {
  it('accepts a well-formed definition', () => {
    expect(validateDefinition(goodDef)).toEqual([]);
  });
  it('rejects a missing request.url', () => {
    const bad = { ...goodDef, request: { ...goodDef.request, url: undefined } };
    expect(validateDefinition(bad).length).toBeGreaterThan(0);
  });
});

describe('requiredParams', () => {
  it('lists non-secret tokens from url + query', () => {
    const def: any = { request: { url: 'https://x/{lineId}', query: { d: '{dir}' }, pagination: { style: 'none' } }, response: { format: 'json', rootPath: '' }, mapping: { fields: [] } };
    expect(requiredParams(def).sort()).toEqual(['dir', 'lineId']);
  });
});

describe('resource routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET returns the resource with masked secrets and params', async () => {
    (prisma.connectorResource.findUnique as any).mockResolvedValue({ id: 'r1', connectorId: 'c1', kind: 'LINE', name: 'L', definition: goodDef, secrets: null });
    const res = await request(app()).get('/api/connector/c1/line');
    expect(res.status).toBe(200);
    expect(res.body.params).toEqual([]);
    expect(res.body.secrets).toEqual({});
  });

  it('PATCH rejects a malformed definition', async () => {
    const res = await request(app()).patch('/api/connector/c1/line').send({ name: 'L', definition: { request: {} } });
    expect(res.status).toBe(422);
  });

  it('preview returns diagnostics for a broken mapping', async () => {
    (prisma.connectorResource.findUnique as any).mockResolvedValue({ connectorId: 'c1', kind: 'LINE', name: 'L', definition: goodDef, secrets: null });
    const res = await request(app())
      .post('/api/connector/c1/line/preview')
      .send({ sampleResponse: { data: [{ nope: 1 }] } });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.envelope.data.length).toBe(1);
  });
});
