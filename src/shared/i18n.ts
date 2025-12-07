function applySubstitutions(template: string, substitutions?: string | string[]): string {
  if (!substitutions) return template;

  const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
  return template.replace(/\$(\d+)/g, (match, idx) => {
    const replacement = subs[Number(idx) - 1];
    return typeof replacement === 'string' ? replacement : match;
  });
}

export function t(key: string, substitutions?: string | string[], fallback?: string): string {
  try {
    if (typeof chrome !== 'undefined' && chrome?.i18n?.getMessage) {
      const message = chrome.i18n.getMessage(key, substitutions);
      if (message) return message;
      if (message === '') return '';
    }
  } catch (error) {
    console.warn('[NotebookLM Shortcut Extension] i18n lookup failed for key:', key, error);
  }

  const fallbackBase = fallback ?? key;
  return applySubstitutions(fallbackBase, substitutions);
}
