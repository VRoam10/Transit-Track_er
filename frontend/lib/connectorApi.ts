import { ConnectorDefinition } from './connectorDefinition';

const base = () => process.env.NEXT_PUBLIC_API_URL ?? '';
const auth = (token: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as any));
    if (Array.isArray(body?.errors)) throw new Error(body.errors.join('; '));
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export interface ResourceRecord {
  id: string; connectorId: string; kind: string; name: string;
  definition: ConnectorDefinition; params: string[]; secrets: Record<string, string>;
}
export interface PreviewResult {
  ok: boolean; stage?: string; message?: string; raw?: any;
  envelope?: { total_count: number; data: any[]; pagination: { next: string | number | null } };
  diagnostics?: any[];
}

export const connectorApi = {
  getResource: (connectorId: string, subroute: string, token: string): Promise<ResourceRecord> =>
    fetch(`${base()}/api/connector/${connectorId}/${subroute}`, { headers: auth(token) }).then(handle),
  saveResource: (connectorId: string, subroute: string, body: { name: string; definition: ConnectorDefinition; secrets?: Record<string, string | null> }, token: string) =>
    fetch(`${base()}/api/connector/${connectorId}/${subroute}`, { method: 'PATCH', headers: auth(token), body: JSON.stringify(body) }).then(handle),
  previewResource: (connectorId: string, subroute: string, body: { definition?: ConnectorDefinition; secrets?: Record<string, string>; params?: Record<string, any>; page?: any; sampleResponse?: any }, token: string): Promise<PreviewResult> =>
    fetch(`${base()}/api/connector/${connectorId}/${subroute}/preview`, { method: 'POST', headers: auth(token), body: JSON.stringify(body) }).then(handle),
  deleteResource: (connectorId: string, subroute: string, token: string) =>
    fetch(`${base()}/api/connector/${connectorId}/${subroute}`, { method: 'DELETE', headers: auth(token) }).then(handle),
  listConnectors: (token: string) =>
    fetch(`${base()}/api/connector`, { headers: auth(token) }).then(handle),
  getConnector: (id: string, token: string) =>
    fetch(`${base()}/api/connector/${id}`, { headers: auth(token) }).then(handle),
};
