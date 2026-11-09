import { ConnectorDefinition } from '../definition.types';
import { resolveTemplate, resolveTemplateObject } from './template';

export interface PageCursor { offset?: number; page?: number; cursor?: string; }

export interface BuiltRequest {
  method: 'GET' | 'POST';
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
  missing: string[];
}

export function buildRequest(
  def: ConnectorDefinition,
  params: Record<string, any>,
  secrets: Record<string, string>,
  page: PageCursor,
): BuiltRequest {
  const { request } = def;
  const missing: string[] = [];

  const urlR = resolveTemplate(request.url, params, secrets);
  missing.push(...urlR.missing);
  const url = new URL(urlR.value);

  const queryR = resolveTemplateObject(request.query, params, secrets);
  missing.push(...queryR.missing);
  for (const [k, v] of Object.entries(queryR.value)) url.searchParams.set(k, v);

  const p = request.pagination;
  if (p.style === 'offset') {
    url.searchParams.set(p.offsetParam, String(page.offset ?? 0));
    if (p.limitParam) url.searchParams.set(p.limitParam, String(p.limit));
    else url.searchParams.set('limit', String(p.limit));
  } else if (p.style === 'page') {
    url.searchParams.set(p.pageParam, String(page.page ?? p.startPage ?? 1));
    if (p.limitParam) url.searchParams.set(p.limitParam, String(p.limit));
    else url.searchParams.set('limit', String(p.limit));
  } else if (p.style === 'cursor') {
    if (page.cursor) url.searchParams.set(p.cursorParam, page.cursor);
    if (p.limitParam) url.searchParams.set(p.limitParam, String(p.limit));
  }

  const headersR = resolveTemplateObject(request.headers, params, secrets);
  missing.push(...headersR.missing);

  let body: unknown = request.body ?? null;
  if (request.method === 'POST' && typeof request.body === 'string') {
    const bodyR = resolveTemplate(request.body, params, secrets);
    missing.push(...bodyR.missing);
    body = bodyR.value;
  }

  return {
    method: request.method,
    url: url.toString(),
    headers: headersR.value,
    body,
    timeoutMs: request.timeoutMs ?? 8000,
    missing,
  };
}
