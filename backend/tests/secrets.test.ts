import { describe, it, expect } from 'vitest';
import { encryptSecrets, decryptSecrets, maskSecrets } from '../src/connector/engine/secrets';

const KEY = Buffer.alloc(32, 7);

describe('secrets', () => {
  it('round-trips an encrypted map', () => {
    const blob = encryptSecrets({ apiKey: 's3cr3t' }, KEY);
    expect(Buffer.isBuffer(blob)).toBe(true);
    expect(decryptSecrets(blob, KEY)).toEqual({ apiKey: 's3cr3t' });
  });
  it('masks values but keeps names', () => {
    const blob = encryptSecrets({ apiKey: 's3cr3t', token: 'x' }, KEY);
    expect(maskSecrets(blob, KEY)).toEqual({ apiKey: '***', token: '***' });
  });
  it('masks null blob to empty object', () => {
    expect(maskSecrets(null, KEY)).toEqual({});
  });
});
