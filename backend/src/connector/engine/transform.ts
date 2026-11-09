import jsonata from 'jsonata';
import { MappingSpec } from '../definition.types';
import { applyOps } from './ops';
import { getPath, setPath } from './util';

export interface FieldDiag { target: string; status: 'ok' | 'missing' | 'error'; detail?: string; }
export interface ItemResult { item: Record<string, any>; diags: FieldDiag[]; }

export async function transformItem(raw: Record<string, any>, mapping: MappingSpec): Promise<ItemResult> {
  const item: Record<string, any> = {};
  const diags: FieldDiag[] = [];

  for (const field of mapping.fields) {
    try {
      let value: unknown;
      if (field.expr) {
        value = await jsonata(field.expr).evaluate(raw);
      } else {
        const base = field.source ? getPath(raw, field.source) : undefined;
        value = applyOps(base, field.ops, { item: raw });
      }
      if (value === undefined || value === null) {
        diags.push({ target: field.target, status: 'missing', detail: field.source ? `source '${field.source}' not found in item` : 'produced no value' });
      } else {
        setPath(item, field.target, value);
        diags.push({ target: field.target, status: 'ok' });
      }
    } catch (e: any) {
      diags.push({ target: field.target, status: 'error', detail: String(e?.message ?? e) });
    }
  }

  return { item, diags };
}
