import { complianceFor, ComplianceField } from '../compliance';
import { ResourceKind } from '../definition.types';

export interface ValidationFieldDiag {
  target: string;
  status: 'ok' | 'missing' | 'wrongType';
  expected?: string;
  got?: string;
}

function typeOk(type: string, value: any): boolean {
  switch (type) {
    case 'String': return typeof value === 'string';
    case 'Int': return typeof value === 'number' && Number.isInteger(value);
    case 'Float': return typeof value === 'number';
    case 'Boolean': return typeof value === 'boolean';
    case 'Datetime': return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
    default: return false;
  }
}

function checkField(prefix: string, field: ComplianceField, container: any, out: ValidationFieldDiag[]) {
  const target = prefix ? `${prefix}.${field.name}` : field.name;
  const value = container == null ? undefined : container[field.name];
  if (value === undefined || value === null) {
    out.push({ target, status: field.optional ? 'ok' : 'missing' });
    return;
  }
  if ('object' in field) {
    out.push({ target, status: 'ok' });
    for (const sub of field.object) checkField(target, sub, value, out);
  } else if (typeOk(field.type, value)) {
    out.push({ target, status: 'ok' });
  } else {
    out.push({ target, status: 'wrongType', expected: field.type, got: typeof value });
  }
}

export function validateItem(item: Record<string, any>, kind: ResourceKind): ValidationFieldDiag[] {
  const out: ValidationFieldDiag[] = [];
  for (const field of complianceFor(kind)) checkField('', field, item, out);
  return out;
}
