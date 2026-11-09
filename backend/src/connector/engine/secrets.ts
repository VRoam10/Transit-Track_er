import crypto from 'crypto';

const IV_LEN = 12;
const TAG_LEN = 16;

export function encryptSecrets(map: Record<string, string>, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(map), 'utf8');
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

export function decryptSecrets(blob: Buffer, key: Buffer): Record<string, string> {
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString('utf8'));
}

export function maskSecrets(blob: Buffer | null, key: Buffer): Record<string, '***'> {
  if (!blob) return {};
  const map = decryptSecrets(blob, key);
  return Object.fromEntries(Object.keys(map).map(k => [k, '***'])) as Record<string, '***'>;
}

export function getKey(): Buffer {
  const raw = process.env.CONNECTOR_SECRET_KEY;
  if (!raw) throw new Error('CONNECTOR_SECRET_KEY is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('CONNECTOR_SECRET_KEY must be 32 bytes (base64)');
  return key;
}
