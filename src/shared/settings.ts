import { DEFAULT_FEATURE_TOGGLES } from '@/shared/feature-flags';
import type { FeatureToggleKey } from '@/shared/feature-flags';

export interface KeyBinding {
  key: string;
  code: string;
  mod?: boolean;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export type ShortcutId =
  | 'scrollTop'
  | 'scrollBottom'
  | 'scrollUp'
  | 'scrollDown'
  | 'scrollHalfUp'
  | 'scrollHalfDown'
  | 'toggleFocus'
  | 'toggleHeader'
  | 'addSources'
  | 'deleteChat'
  | 'toggleRightSidebar'
  | 'toggleLeftSidebar';

export interface ShortcutDefinition {
  id: ShortcutId;
  label: string;
  labelKey: string;
  category: FeatureToggleKey;
  defaultBindings: KeyBinding[];
}

export interface SettingsData {
  featureToggles: Record<FeatureToggleKey, boolean>;
  shortcuts: Record<ShortcutId, KeyBinding[]>;
}

/** Input type for mergeSettings - allows partial nested values */
export interface PartialSettingsInput {
  featureToggles?: Partial<Record<FeatureToggleKey, boolean>>;
  shortcuts?: Partial<Record<ShortcutId, KeyBinding[]>>;
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  // Vim Scroll (6 shortcuts)
  {
    id: 'scrollTop',
    label: 'Scroll to Top',
    labelKey: 'shortcut_scrollTop',
    category: 'vimScroll',
    defaultBindings: [{ key: 'k', code: 'KeyK', mod: true }],
  },
  {
    id: 'scrollBottom',
    label: 'Scroll to Bottom',
    labelKey: 'shortcut_scrollBottom',
    category: 'vimScroll',
    defaultBindings: [{ key: 'j', code: 'KeyJ', mod: true }],
  },
  {
    id: 'scrollUp',
    label: 'Scroll Up',
    labelKey: 'shortcut_scrollUp',
    category: 'vimScroll',
    defaultBindings: [{ key: 'k', code: 'KeyK' }],
  },
  {
    id: 'scrollDown',
    label: 'Scroll Down',
    labelKey: 'shortcut_scrollDown',
    category: 'vimScroll',
    defaultBindings: [{ key: 'j', code: 'KeyJ' }],
  },
  {
    id: 'scrollHalfUp',
    label: 'Scroll Half Page Up',
    labelKey: 'shortcut_scrollHalfUp',
    category: 'vimScroll',
    defaultBindings: [{ key: 'K', code: 'KeyK', shift: true }],
  },
  {
    id: 'scrollHalfDown',
    label: 'Scroll Half Page Down',
    labelKey: 'shortcut_scrollHalfDown',
    category: 'vimScroll',
    defaultBindings: [{ key: 'J', code: 'KeyJ', shift: true }],
  },

  // Wide Screen (1 shortcut)
  {
    id: 'toggleFocus',
    label: 'Toggle Focus',
    labelKey: 'shortcut_toggleFocus',
    category: 'wideScreen',
    defaultBindings: [{ key: ' ', code: 'Space', shift: true }],
  },

  // Other Shortcuts (5 shortcuts)
  {
    id: 'toggleHeader',
    label: 'Toggle Header',
    labelKey: 'shortcut_toggleHeader',
    category: 'otherShortcuts',
    defaultBindings: [{ key: 'S', code: 'KeyS', mod: true, shift: true }],
  },
  {
    id: 'addSources',
    label: 'Add Sources',
    labelKey: 'shortcut_addSources',
    category: 'otherShortcuts',
    defaultBindings: [{ key: 'u', code: 'KeyU', mod: true }],
  },
  {
    id: 'deleteChat',
    label: 'Delete chat history',
    labelKey: 'shortcut_deleteChat',
    category: 'otherShortcuts',
    defaultBindings: [{ key: 'Backspace', code: 'Backspace', mod: true, shift: true }],
  },
  {
    id: 'toggleRightSidebar',
    label: 'Toggle Right Side Bar / Move Right Tab',
    labelKey: 'shortcut_toggleRightSidebar',
    category: 'otherShortcuts',
    defaultBindings: [{ key: '.', code: 'Period', mod: true }],
  },
  {
    id: 'toggleLeftSidebar',
    label: 'Toggle Left Side Bar / Move Left Tab',
    labelKey: 'shortcut_toggleLeftSidebar',
    category: 'otherShortcuts',
    defaultBindings: [{ key: ',', code: 'Comma', mod: true }],
  },
];

export const DEFAULT_SHORTCUTS: Record<ShortcutId, KeyBinding[]> = SHORTCUT_DEFINITIONS.reduce(
  (acc, shortcut) => {
    acc[shortcut.id] = shortcut.defaultBindings;
    return acc;
  },
  {} as Record<ShortcutId, KeyBinding[]>,
);

export const DEFAULT_SETTINGS: SettingsData = {
  featureToggles: { ...DEFAULT_FEATURE_TOGGLES },
  shortcuts: { ...DEFAULT_SHORTCUTS },
};

export const STORAGE_KEY = 'notebookLMCombinedSettings';

export function mergeSettings(partial: PartialSettingsInput | undefined | null): SettingsData {
  const featureToggles = { ...DEFAULT_FEATURE_TOGGLES, ...(partial?.featureToggles ?? {}) };
  const shortcuts: Record<ShortcutId, KeyBinding[]> = { ...DEFAULT_SHORTCUTS };

  if (partial?.shortcuts) {
    for (const [id, bindings] of Object.entries(partial.shortcuts)) {
      if (!Array.isArray(bindings)) continue;
      const shortcutId = id as ShortcutId;
      // Reset to default if empty array
      shortcuts[shortcutId] = bindings.length ? bindings : DEFAULT_SHORTCUTS[shortcutId];
    }
  }

  return { featureToggles, shortcuts };
}

export {
  DEFAULT_FEATURE_TOGGLES,
  FEATURE_TOGGLE_KEYS,
  FEATURE_TOGGLE_LABELS,
  type FeatureToggleKey,
} from '@/shared/feature-flags';
