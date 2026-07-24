import { describe, it, expect } from 'vitest';
import { assertPublicUrl } from '../src/connector/engine/fetch';

describe('assertPublicUrl', () => {
  it('allows a public https host', () => {
    expect(() => assertPublicUrl('https://api.example.com/x')).not.toThrow();
  });
  it('rejects non-http(s)', () => {
    expect(() => assertPublicUrl('file:///etc/passwd')).toThrow();
  });
  it('rejects loopback', () => {
    expect(() => assertPublicUrl('http://127.0.0.1/x')).toThrow();
    expect(() => assertPublicUrl('http://localhost/x')).toThrow();
  });
  it('rejects private ranges', () => {
    expect(() => assertPublicUrl('http://10.0.0.5/x')).toThrow();
    expect(() => assertPublicUrl('http://192.168.1.2/x')).toThrow();
    expect(() => assertPublicUrl('http://169.254.1.1/x')).toThrow();
  });
});
