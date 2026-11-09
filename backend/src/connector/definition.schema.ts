import { ConnectorDefinition } from './definition.types';
import { extractTokens } from './engine/template';

const PAGINATION_STYLES = ['none', 'offset', 'page', 'cursor'];

export function validateDefinition(def: any): string[] {
  const errors: string[] = [];
  if (typeof def !== 'object' || def === null) return ['definition must be an object'];

  const r = def.request;
  if (typeof r !== 'object' || r === null) errors.push('request is required');
  else {
    if (r.method !== 'GET' && r.method !== 'POST') errors.push('request.method must be GET or POST');
    if (typeof r.url !== 'string' || r.url.length === 0) errors.push('request.url is required');
    if (typeof r.pagination !== 'object' || !PAGINATION_STYLES.includes(r.pagination?.style)) errors.push('request.pagination.style is invalid');
  }

  const resp = def.response;
  if (typeof resp !== 'object' || resp === null) errors.push('response is required');
  else {
    if (resp.format !== 'json') errors.push("response.format must be 'json'");
    if (typeof resp.rootPath !== 'string') errors.push('response.rootPath must be a string');
  }

  const map = def.mapping;
  if (typeof map !== 'object' || map === null || !Array.isArray(map.fields)) errors.push('mapping.fields must be an array');
  else {
    map.fields.forEach((f: any, i: number) => {
      if (typeof f.target !== 'string' || !f.target) errors.push(`mapping.fields[${i}].target is required`);
      if (f.source === undefined && f.expr === undefined && !Array.isArray(f.ops)) errors.push(`mapping.fields[${i}] needs source, expr, or ops`);
      if (f.source !== undefined && f.expr !== undefined) errors.push(`mapping.fields[${i}] cannot have both source and expr`);
    });
  }

  return errors;
}

export function requiredParams(def: ConnectorDefinition): string[] {
  const tokens = new Set<string>();
  extractTokens(def.request.url).forEach(t => tokens.add(t));
  for (const v of Object.values(def.request.query ?? {})) extractTokens(v).forEach(t => tokens.add(t));
  for (const v of Object.values(def.request.headers ?? {})) extractTokens(v).forEach(t => tokens.add(t));
  return [...tokens];
}
