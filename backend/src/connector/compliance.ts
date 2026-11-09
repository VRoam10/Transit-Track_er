import { ResourceKind } from './definition.types';

export type ComplianceField =
  | { name: string; type: 'String' | 'Int' | 'Float' | 'Datetime' | 'Boolean'; optional?: boolean }
  | { name: string; object: ComplianceField[]; optional?: boolean };

const SCHEMAS: Record<ResourceKind, ComplianceField[]> = {
  LINE: [
    { name: 'id', type: 'String' },
    { name: 'name', type: 'String' },
    { name: 'color', type: 'String' },
  ],
  STOP: [
    { name: 'id', type: 'String' },
    { name: 'name', type: 'String' },
    { name: 'direction', type: 'Int' },
    { name: 'order', type: 'Int' },
  ],
  DIRECTION: [
    { name: 'id', type: 'Int' },
    { name: 'name', type: 'String' },
    { name: 'parcoursId', type: 'String' },
  ],
  NEXTPASSAGE: [
    { name: 'id', type: 'String' },
    { name: 'lineId', type: 'String', optional: true },
    { name: 'name', type: 'String' },
    { name: 'direction', type: 'Int' },
    { name: 'nextTrain', type: 'Datetime' },
    { name: 'coordonnees', optional: true, object: [
      { name: 'lat', type: 'Float', optional: true },
      { name: 'lon', type: 'Float', optional: true },
    ] },
    { name: 'extraction', type: 'Datetime', optional: true },
  ],
};

export function complianceFor(kind: ResourceKind): ComplianceField[] {
  return SCHEMAS[kind];
}
