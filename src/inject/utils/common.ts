import type { ShortcutItem } from '@/inject/types/global';
import { bindingsToDisplayText, isMac as isMacPlatform } from '@/shared/keyboard';
import type { KeyBinding } from '@/shared/settings';

// Constants
export const MIN_WIDE_WIDTH = 1051;
export const SCROLLING_SPEED = 20;

const ADD_SOURCES_BINDINGS: KeyBinding[] = isMacPlatform()
  ? [{ key: 'u', code: 'KeyU', mod: true }]
  : [{ key: 'u', code: 'KeyU', mod: true, shift: true }];

function formatShortcut(bindings: KeyBinding[]): string {
  return bindingsToDisplayText(bindings, { tokenSeparator: ' ' });
}

// Shortcut definitions for help modal
export const COMMON_SHORTCUTS: ShortcutItem[] = [
  {
    item: 'Keyboard shortcuts',
    shortcut: formatShortcut([{ key: '/', code: 'Slash', mod: true }]),
  },
  {
    item: 'Scroll to Top',
    shortcut: formatShortcut([{ key: 'k', code: 'KeyK', mod: true }]),
  },
  {
    item: 'Scroll to Bottom',
    shortcut: formatShortcut([{ key: 'j', code: 'KeyJ', mod: true }]),
  },
  { item: 'Scroll Up', shortcut: formatShortcut([{ key: 'k', code: 'KeyK' }]) },
  { item: 'Scroll Down', shortcut: formatShortcut([{ key: 'j', code: 'KeyJ' }]) },
  {
    item: 'Scroll Half Page Up',
    shortcut: formatShortcut([{ key: 'K', code: 'KeyK', shift: true }]),
  },
  {
    item: 'Scroll Half Page Down',
    shortcut: formatShortcut([{ key: 'J', code: 'KeyJ', shift: true }]),
  },
  {
    item: 'Toggle Header',
    shortcut: formatShortcut([{ key: 'S', code: 'KeyS', mod: true, shift: true }]),
  },
  { item: 'Add Sources', shortcut: formatShortcut(ADD_SOURCES_BINDINGS) },
];

export const LARGE_SCREEN_SHORTCUTS: ShortcutItem[] = [
  {
    item: 'Toggle Right Side Bar',
    shortcut: formatShortcut([{ key: '.', code: 'Period', mod: true }]),
  },
  {
    item: 'Toggle Left Side Bar',
    shortcut: formatShortcut([{ key: ',', code: 'Comma', mod: true }]),
  },
  {
    item: 'Delete chat history',
    shortcut: formatShortcut([{ key: 'Backspace', code: 'Backspace', mod: true, shift: true }]),
  },
];

export const SMALL_SCREEN_SHORTCUTS: ShortcutItem[] = [
  {
    item: 'Move Right Tab',
    shortcut: formatShortcut([{ key: '.', code: 'Period', mod: true }]),
  },
  {
    item: 'Move Left Tab',
    shortcut: formatShortcut([{ key: ',', code: 'Comma', mod: true }]),
  },
];

export function isMac(): boolean {
  return isMacPlatform();
}

export function isWideScreen(): boolean {
  return window.innerWidth >= MIN_WIDE_WIDTH;
}

export function isEditableElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof Element)) return false;

  const tag = el.tagName || '';
  if (/^(INPUT|TEXTAREA|SELECT)$/i.test(tag)) return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return !!el.closest?.('[contenteditable="true"]');
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function waitForElement(
  selector: string,
  { timeout = 5000, interval = 50 }: { timeout?: number; interval?: number } = {},
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        resolve(el);
        return;
      }
      if (performance.now() - start > timeout) {
        clearInterval(timer);
        reject(new Error(`Timeout: Element not found -> ${selector}`));
      }
    }, interval);
  });
}

export function sendEscapeLike(): void {
  const evInit: KeyboardEventInit = {
    key: 'Escape',
    code: 'Escape',
    keyCode: 27,
    which: 27,
    bubbles: true,
    cancelable: true,
  };

  const targets = [window, document, document.body, document.activeElement].filter(
    Boolean,
  ) as EventTarget[];

  for (const t of targets) {
    try {
      t.dispatchEvent(new KeyboardEvent('keydown', evInit));
      t.dispatchEvent(new KeyboardEvent('keyup', evInit));
    } catch {
      // ignore
    }
  }

  const active = document.activeElement;
  if (active && active instanceof HTMLElement && typeof active.blur === 'function') {
    active.blur();
  }
}
