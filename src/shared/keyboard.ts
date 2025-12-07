import type { KeyBinding } from '@/shared/settings';

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toLowerCase().includes('mac');
}

export function isModKey(event: KeyboardEvent): boolean {
  return isMac() ? event.metaKey : event.ctrlKey;
}

export function resolveBindingModifiers(binding: KeyBinding): {
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
} {
  const mac = isMac();
  const usesMod = !!binding.mod;
  const hasMeta = !!binding.meta;
  const hasCtrl = !!binding.ctrl;

  const meta = usesMod ? mac : hasMeta;

  let ctrl: boolean;
  if (usesMod) {
    ctrl = !mac;
  } else if (hasMeta && !hasCtrl) {
    ctrl = !mac;
  } else {
    ctrl = hasCtrl;
  }

  return {
    meta,
    ctrl,
    alt: !!binding.alt,
    shift: !!binding.shift,
  };
}

const SPECIAL_KEYS: Record<string, string> = {
  ' ': 'Space',
  Space: 'Space',
  Spacebar: 'Space',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
  Backspace: '⌫',
  Delete: '⌦',
  Enter: 'Enter',
};

export function formatKeyForDisplay(key: string): string {
  if (SPECIAL_KEYS[key]) return SPECIAL_KEYS[key];
  if (key.length === 1) return key.toUpperCase();
  return key;
}

const CODE_KEY_MAP: Record<string, string> = {
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Space: ' ',
};

function getModLabel(useSymbols: boolean, mac: boolean): string {
  if (mac) return useSymbols ? '⌘' : 'Cmd';
  return 'Ctrl';
}

function getMetaLabel(useSymbols: boolean, mac: boolean): string {
  if (mac) return useSymbols ? '⌘' : 'Cmd';
  return 'Win';
}

function getAltLabel(useSymbols: boolean, mac: boolean): string {
  if (mac) return useSymbols ? '⌥' : 'Option';
  return 'Alt';
}

function getShiftLabel(useSymbols: boolean): string {
  return useSymbols ? '⇧' : 'Shift';
}

function getCtrlLabel(useSymbols: boolean, mac: boolean): string {
  if (mac && useSymbols) return '⌃';
  return 'Ctrl';
}

export function getModKeyText(): string {
  return getModLabel(false, isMac());
}

export function getModKeySymbol(): string {
  return getModLabel(true, isMac());
}

export function getAltKeyText(): string {
  return getAltLabel(false, isMac());
}

export function getAltKeySymbol(): string {
  return getAltLabel(true, isMac());
}

export function keyFromCode(code: string | undefined | null): string | null {
  if (!code) return null;

  const letterMatch = code.match(/^Key([A-Z])$/);
  if (letterMatch) return letterMatch[1];

  const digitMatch = code.match(/^Digit([0-9])$/);
  if (digitMatch) return digitMatch[1];

  if (CODE_KEY_MAP[code]) return CODE_KEY_MAP[code];

  if (/^F[0-9]{1,2}$/.test(code)) return code;

  return null;
}

export function bindingToTokens(
  binding: KeyBinding,
  options: { useSymbols?: boolean } = {},
): string[] {
  const { useSymbols = isMac() } = options;
  const mac = isMac();
  const { meta, ctrl, alt, shift } = resolveBindingModifiers(binding);

  const tokens: string[] = [];

  if (meta) tokens.push(getMetaLabel(useSymbols, mac));
  if (ctrl) tokens.push(getCtrlLabel(useSymbols, mac));
  if (alt) tokens.push(getAltLabel(useSymbols, mac));
  if (shift) tokens.push(getShiftLabel(useSymbols));

  const keyLabel = formatKeyForDisplay(binding.key || '');
  if (keyLabel) tokens.push(keyLabel);

  return tokens;
}

export function bindingsToDisplayText(
  bindings: KeyBinding[],
  options: { useSymbols?: boolean; tokenSeparator?: string; bindingSeparator?: string } = {},
): string {
  const { useSymbols = isMac(), tokenSeparator = ' + ', bindingSeparator = ' / ' } = options;

  return bindings
    .map(binding => bindingToTokens(binding, { useSymbols }).join(tokenSeparator))
    .filter(Boolean)
    .join(bindingSeparator);
}
