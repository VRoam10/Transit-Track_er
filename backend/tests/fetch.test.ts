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
  it('rejects IPv6 literals and other blocked hosts', () => {
    expect(() => assertPublicUrl('http://[::ffff:127.0.0.1]/x')).toThrow();
    expect(() => assertPublicUrl('http://[::1]/x')).toThrow();
    expect(() => assertPublicUrl('http://[fe80::1]/x')).toThrow();
    expect(() => assertPublicUrl('http://[fc00::1]/x')).toThrow();
    expect(() => assertPublicUrl('http://0.0.0.0/x')).toThrow();
    expect(() => assertPublicUrl('http://172.16.0.1/x')).toThrow();
    expect(() => assertPublicUrl('http://172.31.255.1/x')).toThrow();
  });
  it('allows hosts outside the blocked ranges', () => {
    expect(() => assertPublicUrl('http://172.15.0.1/x')).not.toThrow();
    expect(() => assertPublicUrl('http://172.32.0.1/x')).not.toThrow();
    expect(() => assertPublicUrl('http://11.0.0.1/x')).not.toThrow();
    expect(() => assertPublicUrl('https://api.example.com/x')).not.toThrow();
  });
});
