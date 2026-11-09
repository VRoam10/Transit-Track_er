import moment from 'moment';
import { Op } from '../definition.types';
import { getPath } from './util';

export interface OpContext { item: Record<string, any>; }

function fill(parts: string[], item: Record<string, any>): string {
  return parts
    .map(p => {
      const m = /^\{(.+)\}$/.exec(p);
      return m ? String(getPath(item, m[1]) ?? '') : p;
    })
    .join('');
}

export function applyOps(value: unknown, ops: Op[] | undefined, ctx: OpContext): unknown {
  let v = value;
  for (const op of ops ?? []) {
    switch (op.op) {
      case 'default': if (v === null || v === undefined) v = op.value; break;
      case 'const': v = op.value; break;
      case 'toInt': v = v === null || v === undefined ? v : parseInt(String(v), 10); break;
      case 'toFloat': v = v === null || v === undefined ? v : parseFloat(String(v)); break;
      case 'toString': v = v === null || v === undefined ? v : String(v); break;
      case 'toBool': {
        if (v === null || v === undefined) break;
        if (typeof v === 'string') {
          const s = v.trim().toLowerCase();
          if (s === 'true' || s === '1' || s === 'yes') v = true;
          else if (s === 'false' || s === '0' || s === 'no' || s === '') v = false;
          else v = Boolean(v);
        } else {
          v = Boolean(v);
        }
        break;
      }
      case 'parseDate': {
        if (v === null || v === undefined) break;
        if (op.from === 'unix') v = moment.unix(Number(v));
        else if (op.from === 'unixMs') v = moment(Number(v));
        else if (op.from === 'iso') v = moment(String(v), moment.ISO_8601);
        else v = moment(String(v), op.from);
        break;
      }
      case 'formatDate': {
        const m = moment.isMoment(v) ? v : moment(v as any);
        v = op.to === 'iso' ? m.toISOString() : m.format(op.to);
        break;
      }
      case 'coalesce': {
        const found = op.paths.map(p => getPath(ctx.item, p)).find(x => x !== null && x !== undefined);
        v = found === undefined ? v : found;
        break;
      }
      case 'concat': v = op.parts.map(p => fill([p], ctx.item)).join(op.sep ?? ''); break;
      case 'prefix': v = `${op.value}${v ?? ''}`; break;
      case 'suffix': v = `${v ?? ''}${op.value}`; break;
      case 'lookup': v = Object.prototype.hasOwnProperty.call(op.map, String(v)) ? op.map[String(v)] : op.fallback; break;
      case 'round': { const f = Math.pow(10, op.decimals ?? 0); v = Math.round(Number(v) * f) / f; break; }
      case 'multiply': v = Number(v) * op.by; break;
    }
  }
  return v;
}
