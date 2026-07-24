import { prisma } from '../src/lib/prisma';
import { ConnectorDefinition, ResourceKind } from '../src/connector/definition.types';

export function convertResourceRow(
  row: { apiUrl: string; params: string[]; transformation: any[] },
  _kind: ResourceKind,
): ConnectorDefinition {
  const query: Record<string, string> = {};
  for (const p of row.params) query[p] = `{${p}}`;

  const fields = (row.transformation ?? []).map((t: any) => ({
    target: t.transformed,
    source: t.original,
  }));

  return {
    request: {
      method: 'GET',
      url: row.apiUrl,
      query,
      pagination: { style: 'none' },
    },
    response: { format: 'json', rootPath: 'data' },
    mapping: { fields },
  };
}

const TABLES: { kind: ResourceKind; read: () => Promise<any[]> }[] = [
  { kind: 'LINE', read: () => prisma.line.findMany() },
  { kind: 'STOP', read: () => prisma.stop.findMany() },
  { kind: 'DIRECTION', read: () => prisma.direction.findMany() },
  { kind: 'NEXTPASSAGE', read: () => prisma.nextPassage.findMany() },
];

export async function migrate(): Promise<void> {
  for (const { kind, read } of TABLES) {
    const rows = await read();
    for (const row of rows) {
      try {
        const definition = convertResourceRow(row, kind);
        await prisma.connectorResource.upsert({
          where: { connectorId_kind: { connectorId: row.connectorId, kind } },
          update: { name: row.name, definition: definition as any },
          create: { connectorId: row.connectorId, kind, name: row.name, definition: definition as any },
        });
        console.log(`migrated ${kind} for connector ${row.connectorId}`);
      } catch (e) {
        console.error(`SKIP ${kind} connector ${row.connectorId}:`, e);
      }
    }
  }
}

if (require.main === module) {
  migrate().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
}
