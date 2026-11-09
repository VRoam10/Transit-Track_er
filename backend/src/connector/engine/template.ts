const SECRET_RE = /\{\{secret\.([a-zA-Z0-9_]+)\}\}/g;
const TOKEN_RE = /\{([a-zA-Z0-9_.]+)\}/g;

export function extractTokens(str: string): string[] {
  const withoutSecrets = str.replace(SECRET_RE, '');
  const tokens = new Set<string>();
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(withoutSecrets)) !== null) tokens.add(m[1]);
  return [...tokens];
}

export function resolveTemplate(
  input: string,
  tokens: Record<string, any>,
  secrets: Record<string, string>,
): { value: string; missing: string[] } {
  const missing: string[] = [];
  const withSecrets = input.replace(SECRET_RE, (_full, name) => {
    if (secrets[name] === undefined) { missing.push(`secret.${name}`); return ''; }
    return secrets[name];
  });
  const value = withSecrets.replace(TOKEN_RE, (_full, name) => {
    const v = tokens[name];
    if (v === undefined || v === '') { missing.push(name); return ''; }
    return String(v);
  });
  return { value, missing };
}

export function resolveTemplateObject(
  obj: Record<string, string> | undefined,
  tokens: Record<string, any>,
  secrets: Record<string, string>,
): { value: Record<string, string>; missing: string[] } {
  const value: Record<string, string> = {};
  const missing: string[] = [];
  for (const [k, tmpl] of Object.entries(obj ?? {})) {
    const r = resolveTemplate(tmpl, tokens, secrets);
    value[k] = r.value;
    missing.push(...r.missing);
  }
  return { value, missing };
}
