import { resolveBindingModifiers } from '@/shared/keyboard';
import {
  SHORTCUT_DEFINITIONS,
  type KeyBinding,
  type SettingsData,
  type ShortcutDefinition,
  type ShortcutId,
} from '@/shared/settings';

const shortcutMap = new Map<ShortcutId, ShortcutDefinition>(
  SHORTCUT_DEFINITIONS.map(shortcut => [shortcut.id, shortcut]),
);

export function cloneSettings(settings: SettingsData): SettingsData {
  return {
    featureToggles: { ...settings.featureToggles },
    shortcuts: { ...settings.shortcuts },
  };
}

export function getShortcutDefinition(id: ShortcutId): ShortcutDefinition | undefined {
  return shortcutMap.get(id);
}

export function getBindings(settings: SettingsData, id: ShortcutId): KeyBinding[] {
  const custom = settings.shortcuts[id];
  if (Array.isArray(custom) && custom.length) return custom;
  return shortcutMap.get(id)?.defaultBindings ?? [];
}

export function matchesBinding(binding: KeyBinding, event: KeyboardEvent): boolean {
  const modifiers = resolveBindingModifiers(binding);
  const modifiersMatch =
    modifiers.meta === !!event.metaKey &&
    modifiers.ctrl === !!event.ctrlKey &&
    modifiers.shift === !!event.shiftKey &&
    modifiers.alt === !!event.altKey;

  if (!modifiersMatch) return false;

  const keyMatch = (event.key || '').toLowerCase() === (binding.key || '').toLowerCase();
  const codeMatch = binding.code ? binding.code === event.code : false;
  return keyMatch || codeMatch;
}

export function matchesShortcut(
  event: KeyboardEvent,
  id: ShortcutId,
  settings: SettingsData | null | undefined,
): boolean {
  if (!settings) return false;

  const def = shortcutMap.get(id);
  if (!def) return false;
  if (!settings.featureToggles[def.category]) return false;

  return getBindings(settings, id).some(binding => matchesBinding(binding, event));
}
