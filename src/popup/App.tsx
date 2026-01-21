import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { t } from '@/shared/i18n';
import {
  bindingsToDisplayText,
  bindingToTokens,
  getModKeyText,
  isMac,
  isModKey,
  keyFromCode,
  resolveBindingModifiers,
} from '@/shared/keyboard';
import {
  DEFAULT_SETTINGS,
  FEATURE_TOGGLE_LABELS,
  FEATURE_TOGGLE_KEYS,
  SHORTCUT_DEFINITIONS,
  mergeSettings,
  type FeatureToggleKey,
  type KeyBinding,
  type PartialSettingsInput,
  type SettingsData,
  type ShortcutDefinition,
  type ShortcutId,
} from '@/shared/settings';
import { loadSettings, saveSettings } from '@/shared/storage';

type MessageState = {
  text: string;
  type: 'info' | 'error';
} | null;

const GITHUB_URL = 'https://github.com/gakkunn/Ex-Chrome-NotebookLM';
const SUPPORT_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSc9gdX8Xe9fkCyVL1Bd9Tguvh8-6JCdSYJyxf3BhkLK7sduZA/viewform';
const COFFEE_URL = 'https://buymeacoffee.com/gakkunn';
const REVIEW_URL =
  'https://chromewebstore.google.com/detail/notebooklm-shortcut-effec/filooobdflnbfkmahmnlkcmhigninlnj/reviews?hl=en&authuser=0';

const ICON_GITHUB_SRC = '/img/github.svg';
const ICON_SUPPORT_SRC = '/img/support.svg';
const ICON_COFFEE_SRC = '/img/coffee.svg';
const ICON_REVIEW_SRC = '/img/review.svg';

const modifierKeys = new Set(['Shift', 'Control', 'Alt', 'Meta']);

const BINDING_TEXT_OPTIONS = {
  tokenSeparator: ' + ',
  bindingSeparator: ' / ',
};

const SINGLE_KEY_REQUIRE_MOD = new Set(['Escape', 'Esc', 'Backspace', 'Delete']);
const SINGLE_CODE_REQUIRE_MOD = new Set(['Escape', 'Backspace', 'Delete']);

const FORBIDDEN_KEYS = new Set([
  'Enter',
  'Return',
  'Tab',
  // IME / input-mode switching keys
  'Eisu',
  'Alphanumeric',
  'KanaMode',
  'Zenkaku',
  'Hankaku',
  'HankakuZenkaku',
  'Henkan',
  'NonConvert',
  'Kana',
  'Kanji',
  'Katakana',
  'Hiragana',
  'Romaji',
  // Lock keys
  'CapsLock',
  'NumLock',
  'ScrollLock',
]);

const FORBIDDEN_CODES = new Set([
  'Enter',
  'NumpadEnter',
  'Tab',
  // IME / input-mode switching codes
  'Eisu',
  'NonConvert',
  'Convert',
  'KanaMode',
  'Lang1',
  'Lang2',
  'Lang3',
  'Lang4',
  'Lang5',
  // Lock codes
  'CapsLock',
  'NumLock',
  'ScrollLock',
]);

const WINDOWS_KEY_NAMES = new Set(['meta', 'os', 'win', 'super']);
const WINDOWS_KEY_CODES = new Set(['MetaLeft', 'MetaRight', 'OSLeft', 'OSRight']);

function normalize(value: string | undefined | null): string {
  return (value ?? '').toLowerCase();
}

function normalizeBinding(binding: KeyBinding): KeyBinding & {
  meta: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
} {
  const { meta, ctrl, alt, shift } = resolveBindingModifiers(binding);
  return { ...binding, meta, ctrl, alt, shift };
}

type ValidationResult = 'requiresModifier' | 'forbidden';

function requiresModifierOnlyKey(binding: KeyBinding): boolean {
  const normalizedBinding = normalizeBinding(binding);
  const unmodified =
    !normalizedBinding.meta &&
    !normalizedBinding.ctrl &&
    !normalizedBinding.shift &&
    !normalizedBinding.alt;
  const keyMatch = SINGLE_KEY_REQUIRE_MOD.has(binding.key);
  const codeMatch = binding.code ? SINGLE_CODE_REQUIRE_MOD.has(binding.code) : false;
  return unmodified && (keyMatch || codeMatch);
}

function usesWindowsKey(binding: KeyBinding): boolean {
  const keyLower = normalize(binding.key);
  const keyMatch = WINDOWS_KEY_NAMES.has(keyLower);
  const codeMatch = binding.code ? WINDOWS_KEY_CODES.has(binding.code) : false;
  const normalizedBinding = normalizeBinding(binding);
  const metaOnWindows = !isMac() && normalizedBinding.meta;
  return keyMatch || codeMatch || metaOnWindows;
}

function isForbiddenBinding(binding: KeyBinding): boolean {
  const keyMatch = FORBIDDEN_KEYS.has(binding.key);
  const codeMatch = binding.code ? FORBIDDEN_CODES.has(binding.code) : false;
  if (keyMatch || codeMatch) return true;
  return usesWindowsKey(binding);
}

function validateBinding(binding: KeyBinding): ValidationResult | null {
  if (isForbiddenBinding(binding)) return 'forbidden';
  if (requiresModifierOnlyKey(binding)) return 'requiresModifier';
  return null;
}

function bindingToText(binding: KeyBinding): string {
  return bindingsToDisplayText([binding], BINDING_TEXT_OPTIONS);
}

function bindingToKeycapTokens(binding: KeyBinding): string[] {
  return bindingToTokens(binding, { useSymbols: isMac() });
}

function captureBinding(event: KeyboardEvent): KeyBinding | null {
  if (modifierKeys.has(event.key)) return null;
  const rawKey = event.key === 'Spacebar' ? ' ' : event.key;
  const physicalKey = keyFromCode(event.code);
  const key = isMac() && event.altKey && physicalKey ? physicalKey : rawKey;
  const modPressed = isModKey(event) && !(event.metaKey && event.ctrlKey);
  return {
    key,
    code: event.code,
    mod: modPressed || undefined,
    meta: event.metaKey,
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
  };
}

function isSameBinding(a: KeyBinding, b: KeyBinding): boolean {
  const modifiersA = resolveBindingModifiers(a);
  const modifiersB = resolveBindingModifiers(b);

  const modifiersMatch =
    modifiersA.meta === modifiersB.meta &&
    modifiersA.ctrl === modifiersB.ctrl &&
    modifiersA.shift === modifiersB.shift &&
    modifiersA.alt === modifiersB.alt;
  const keyMatch = a.key.toLowerCase() === b.key.toLowerCase();
  const codeMatch = a.code && b.code ? a.code === b.code : false;
  return modifiersMatch && (keyMatch || codeMatch);
}

function getBindings(settings: SettingsData, def: ShortcutDefinition): KeyBinding[] {
  const stored = settings.shortcuts[def.id];
  if (Array.isArray(stored) && stored.length) return stored;
  return def.defaultBindings;
}

function findConflict(
  binding: KeyBinding,
  settings: SettingsData,
  targetId: ShortcutId,
): ShortcutDefinition | null {
  return (
    SHORTCUT_DEFINITIONS.find(candidate => {
      if (candidate.id === targetId) return false;
      if (!settings.featureToggles[candidate.category]) return false;
      const bindings = getBindings(settings, candidate);
      return bindings.some(stored => isSameBinding(stored, binding));
    }) ?? null
  );
}

function translateFeatureLabel(key: FeatureToggleKey): string {
  const { key: messageKey, defaultMessage } = FEATURE_TOGGLE_LABELS[key];
  if (key === 'safeSend') {
    const modLabel = isMac() ? 'Cmd/Ctrl' : getModKeyText();
    return t(messageKey, [modLabel], `Send with ${modLabel} + Enter`);
  }
  return t(messageKey, undefined, defaultMessage);
}

function translateShortcutLabel(def: ShortcutDefinition): string {
  return t(def.labelKey, undefined, def.label);
}

export function App(): JSX.Element {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [message, setMessage] = useState<MessageState>(null);
  const [errorShortcut, setErrorShortcut] = useState<ShortcutId | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    void loadSettings()
      .then(data => setSettings(mergeSettings(data)))
      .catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[NotebookLM Shortcut Extension] Failed to load settings', err);
        setMessage({
          text: t(
            'error_load_settings',
            undefined,
            'Failed to load settings. Please reload the page.',
          ),
          type: 'error',
        });
      });
  }, []);

  const enabledShortcuts = useMemo(() => {
    if (!settings) return [];
    return SHORTCUT_DEFINITIONS.filter(def => settings.featureToggles[def.category]);
  }, [settings]);

  const persist = async (update: PartialSettingsInput): Promise<boolean> => {
    if (!settings) return false;
    setMessage(null);
    setErrorShortcut(null);
    setSettings(prev => (prev ? mergeSettings({ ...prev, ...update }) : prev));
    try {
      await saveSettings(update);
      return true;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[NotebookLM Shortcut Extension] Failed to save settings', err);
      setMessage({
        text: t('error_save_settings', undefined, 'Failed to save settings. Please try again.'),
        type: 'error',
      });
      const refreshed = await loadSettings();
      setSettings(mergeSettings(refreshed));
      return false;
    }
  };

  const handleToggleChange = (key: FeatureToggleKey, checked: boolean): void => {
    if (!settings) return;
    void persist({
      featureToggles: { ...settings.featureToggles, [key]: checked },
    });
  };

  const handleShortcutKeydown =
    (def: ShortcutDefinition) =>
    async (event: JSX.TargetedKeyboardEvent<HTMLElement>): Promise<void> => {
      if (!settings) return;
      event.preventDefault();
      event.stopPropagation();

      const binding = captureBinding(event);
      if (!binding) return;

      const validationResult = validateBinding(binding);
      if (validationResult) {
        setErrorShortcut(def.id);
        setMessage({
          text: t(
            validationResult === 'requiresModifier'
              ? 'error_shortcut_requires_modifier'
              : 'error_shortcut_forbidden_key',
            [bindingToText(binding)],
            validationResult === 'requiresModifier'
              ? '"$1" must be combined with a modifier key.'
              : '"$1" cannot be used as a shortcut.',
          ),
          type: 'error',
        });
        return;
      }

      const conflict = findConflict(binding, settings, def.id);
      if (conflict) {
        setErrorShortcut(def.id);
        setMessage({
          text: t(
            'error_shortcut_conflict',
            [bindingToText(binding), translateShortcutLabel(conflict)],
            '"$1" is already assigned to "$2".',
          ),
          type: 'error',
        });
        return;
      }

      const update: PartialSettingsInput = {
        shortcuts: {
          ...settings.shortcuts,
          [def.id]: [binding],
        },
      };

      const ok = await persist(update);
      if (ok) {
        setMessage({
          text: t(
            'info_shortcut_updated',
            [translateShortcutLabel(def), bindingToText(binding)],
            '"$1" was updated to $2.',
          ),
          type: 'info',
        });
      }
    };

  const handleReset = async (): Promise<void> => {
    if (!settings) return;
    setIsResetting(true);
    const ok = await persist(DEFAULT_SETTINGS);
    if (ok) {
      setMessage({
        text: t('info_reset_success', undefined, 'Reset to default settings.'),
        type: 'info',
      });
    }
    setIsResetting(false);
  };

  return (
    <div className="popup-wrapper">
      <header className="header-row">
        <div className="header-titles">
          <h1 className="page-title">
            {t('app_name_short', undefined, 'NotebookLM Shortcut Extension')}
          </h1>
        </div>
        <button
          className="button button--ghost"
          onClick={() => void handleReset()}
          disabled={isResetting || !settings}
        >
          {isResetting
            ? t('button_resetting', undefined, 'Resetting...')
            : t('button_reset', undefined, 'Reset')}
        </button>
      </header>

      <footer className="popup-footer">
        <p className="footer-message">{t('popup_footer_review_prompt')}</p>
        <section className="links">
          <div>
            <a
              className="footer-button github-button"
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Contribute"
            >
              <span>
                <img className="icon" src={ICON_GITHUB_SRC} alt="Contribute" />
              </span>
            </a>
          </div>
          <div>
            <a
              className="footer-button question-button"
              href={SUPPORT_FORM_URL}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Support"
            >
              <span>
                <img className="icon" src={ICON_SUPPORT_SRC} alt="Report a problem" />
              </span>
            </a>
          </div>
          <div>
            <a
              className="footer-button review-button"
              href={REVIEW_URL}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Review"
            >
              <span>
                <img className="icon" src={ICON_REVIEW_SRC} alt="Review" />
              </span>
            </a>
          </div>
          <div>
            <a
              className="footer-button coffee-button"
              href={COFFEE_URL}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Buy me a coffee"
            >
              <span>
                <img className="icon" src={ICON_COFFEE_SRC} alt="Buy me a coffee" />
              </span>
            </a>
          </div>
        </section>
      </footer>

      {!settings && (
        <section className="card">
          <p className="status-text">
            {t('status_loading_settings', undefined, 'Loading settings...')}
          </p>
        </section>
      )}

      {settings && (
        <>
          <section className="card">
            <h2 className="section-title">{t('section_features', undefined, 'Features')}</h2>
            <div className="toggle-list">
              {FEATURE_TOGGLE_KEYS.map(toggleKey => (
                <label key={toggleKey} className="toggle">
                  <input
                    type="checkbox"
                    checked={!!settings.featureToggles[toggleKey]}
                    onChange={event => handleToggleChange(toggleKey, event.currentTarget.checked)}
                  />
                  <span>{translateFeatureLabel(toggleKey)}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="section-title">{t('section_shortcuts', undefined, 'Shortcuts')}</h2>
            <div className="shortcut-message" data-type={message?.type ?? undefined}>
              {message?.text ?? ''}
            </div>
            <div className="shortcuts-list">
              {enabledShortcuts.map(shortcut => {
                const bindings = getBindings(settings, shortcut);
                const hasError = errorShortcut === shortcut.id && message?.type === 'error';
                return (
                  <div key={shortcut.id} className="shortcut-row">
                    <div className="shortcut-label">{translateShortcutLabel(shortcut)}</div>
                    <div
                      className={`shortcut-input${hasError ? ' shortcut-input-error' : ''}`}
                      role="textbox"
                      tabIndex={0}
                      aria-label={translateShortcutLabel(shortcut)}
                      onClick={event => {
                        event.currentTarget.focus();
                      }}
                      onKeyDown={event => {
                        void handleShortcutKeydown(shortcut)(event);
                      }}
                    >
                      <div className="shortcut-keycaps">
                        {bindings.length ? (
                          bindings.map((binding, bindingIndex) => {
                            const tokens = bindingToKeycapTokens(binding);
                            return (
                              <div
                                className="shortcut-keycap-group"
                                key={`${bindingIndex}-${shortcut.id}`}
                              >
                                {tokens.map((token, tokenIndex) => (
                                  <span
                                    className="shortcut-keycap-wrapper"
                                    key={`${token}-${tokenIndex}`}
                                  >
                                    <kbd className="chatgpt-unified-keycap">
                                      <span className="chatgpt-unified-keycap-label">{token}</span>
                                    </kbd>
                                    {!isMac() && tokenIndex < tokens.length - 1 && (
                                      <span className="chatgpt-unified-keycap-sep">+</span>
                                    )}
                                  </span>
                                ))}
                                {bindingIndex < bindings.length - 1 && (
                                  <span className="shortcut-binding-sep">/</span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <span className="shortcut-placeholder">
                            {t('placeholder_press_keys', undefined, 'Press keys')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!enabledShortcuts.length && (
                <p className="helper-text">
                  {t('status_enable_shortcuts', undefined, 'Enable features to use shortcuts.')}
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
