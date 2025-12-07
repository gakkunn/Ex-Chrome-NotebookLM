let messages: Record<string, string> = {};

function applySubstitutions(template: string, substitutions?: string | string[]): string {
  if (!substitutions) return template;

  const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
  return template.replace(/\$(\d+)/g, (match, idx) => {
    const replacement = subs[Number(idx) - 1];
    return typeof replacement === 'string' ? replacement : match;
  });
}

export function setMessages(map: Record<string, string>): void {
  messages = map ?? {};
}

export function ti(key: string, fallback: string, substitutions?: string | string[]): string {
  const template = messages[key] ?? fallback ?? key;
  return applySubstitutions(template, substitutions);
}
