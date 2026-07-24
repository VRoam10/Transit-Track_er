import axios from 'axios';
import http from 'http';
import https from 'https';
import { BuiltRequest } from './request';

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const client = axios.create({ httpAgent, httpsAgent, validateStatus: () => true });

function isPrivateIp(host: string): boolean {
  if (host === 'localhost') return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 127 || a === 10 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function assertPublicUrl(url: string): void {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error(`Invalid URL: ${url}`); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Blocked scheme: ${parsed.protocol}`);
  }
  if (isPrivateIp(parsed.hostname) || parsed.hostname === '::1' || parsed.hostname === '[::1]') {
    throw new Error(`Blocked private host: ${parsed.hostname}`);
  }
}

export async function executeRequest(req: BuiltRequest): Promise<{ status: number; data: any }> {
  assertPublicUrl(req.url);
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client.request({
        method: req.method,
        url: req.url,
        headers: req.headers,
        data: req.method === 'POST' ? req.body : undefined,
        timeout: req.timeoutMs,
      });
      if (res.status >= 500 && attempt === 0) { lastErr = new Error(`Upstream ${res.status}`); continue; }
      return { status: res.status, data: res.data };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Request failed');
}
