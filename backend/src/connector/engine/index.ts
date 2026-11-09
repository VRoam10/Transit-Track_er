import { ConnectorDefinition, ResourceKind, PaginationSpec } from '../definition.types';
import { buildRequest, PageCursor } from './request';
import { executeRequest } from './fetch';
import { parseResponse, extractApiError } from './parse';
import { transformItem } from './transform';
import { validateItem } from './validate';

export interface NormalizedEnvelope {
  total_count: number;
  data: any[];
  pagination: { next: string | number | null };
}
export interface RunResult {
  ok: boolean;
  stage?: string;
  message?: string;
  raw?: any;
  envelope?: NormalizedEnvelope;
  diagnostics?: any[];
}
export interface RunParams {
  params: Record<string, any>;
  page?: PageCursor;
  secrets?: Record<string, string>;
  sampleResponse?: any;
}

function computeNext(p: PaginationSpec, page: PageCursor, count: number, total: number | null, nextCursorRaw: unknown): string | number | null {
  if (p.style === 'none') return null;
  if (p.style === 'cursor') return (nextCursorRaw as string) ?? null;
  if (count < p.limit) return null;
  if (p.style === 'offset') {
    const nextOffset = (page.offset ?? 0) + count;
    if (total !== null && nextOffset >= total) return null;
    return nextOffset;
  }
  // page style: a full page arrived (count === limit, checked above), so advance.
  // A subsequent short/empty page returns null via the count < limit check.
  return (page.page ?? p.startPage ?? 1) + 1;
}

export async function runResource(def: ConnectorDefinition, kind: ResourceKind, run: RunParams): Promise<RunResult> {
  const page = run.page ?? {};
  const secrets = run.secrets ?? {};

  let req;
  try {
    req = buildRequest(def, run.params, secrets, page);
  } catch (e: any) {
    return { ok: false, stage: 'request', message: String(e?.message ?? e) };
  }
  if (req.missing.length > 0) {
    return { ok: false, stage: 'request', message: `Missing required params: ${req.missing.join(', ')}` };
  }

  let raw: any;
  if (run.sampleResponse !== undefined) {
    raw = run.sampleResponse;
  } else {
    try {
      const res = await executeRequest(req);
      raw = res.data;
    } catch (e: any) {
      return { ok: false, stage: 'fetch', message: String(e?.message ?? e) };
    }
  }

  const apiError = extractApiError(raw, def.response);
  if (apiError) return { ok: false, stage: 'parse', message: `Upstream error: ${apiError}`, raw };

  const parsed = parseResponse(raw, def.response, def.request.pagination);

  const data: any[] = [];
  const diagnostics: any[] = [];
  for (const rawItem of parsed.items) {
    const t = await transformItem(rawItem, def.mapping);
    const v = validateItem(t.item, kind);
    data.push(t.item);
    diagnostics.push({ transform: t.diags, validate: v });
  }

  const ok = diagnostics.every(d =>
    d.transform.every((x: any) => x.status !== 'error') &&
    d.validate.every((x: any) => x.status === 'ok'));

  const next = computeNext(def.request.pagination, page, parsed.items.length, parsed.total, parsed.nextCursorRaw);

  return {
    ok,
    raw,
    envelope: { total_count: parsed.total ?? data.length, data, pagination: { next } },
    diagnostics,
  };
}
