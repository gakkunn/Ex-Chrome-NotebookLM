import { INJECT_I18N_KEYS } from '@/shared/i18n-keys';
import { MESSAGE_SOURCE, MESSAGE_TYPES } from '@/shared/messages';
import { mergeSettings, STORAGE_KEY } from '@/shared/settings';
import type { PartialSettingsInput, SettingsData } from '@/shared/settings';
import { loadSettings } from '@/shared/storage';

const ALLOWED_ORIGIN = 'https://notebooklm.google.com';
let trustedNonce: string | null = null;

// Inject the main script into page context
const script = document.createElement('script');
script.type = 'module';
script.src = chrome.runtime.getURL('inject.js');
script.onload = (): void => {
  script.remove();
};
(document.head || document.documentElement).appendChild(script);

// Send settings to inject script via window.postMessage
function postSettings(settings: SettingsData, targetOrigin = ALLOWED_ORIGIN): void {
  if (!trustedNonce) return;
  window.postMessage(
    {
      source: MESSAGE_SOURCE,
      type: MESSAGE_TYPES.settings,
      payload: settings,
      nonce: trustedNonce,
    },
    targetOrigin,
  );
}

function postI18nMessages(targetOrigin = ALLOWED_ORIGIN): void {
  if (!trustedNonce) return;
  const payload: Record<string, string> = {};

  try {
    if (chrome?.i18n?.getMessage) {
      INJECT_I18N_KEYS.forEach(key => {
        const value = chrome.i18n.getMessage(key);
        if (typeof value === 'string') {
          payload[key] = value;
        }
      });
    }
  } catch (error) {
    console.warn(
      '[NotebookLM Shortcut Extension] Failed to gather i18n messages for inject script',
      error,
    );
  }

  window.postMessage(
    {
      source: MESSAGE_SOURCE,
      type: MESSAGE_TYPES.i18n,
      payload,
      nonce: trustedNonce,
    },
    targetOrigin,
  );
}

// Watch for chrome.storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (!changes[STORAGE_KEY]) return;

  const newValue = mergeSettings(changes[STORAGE_KEY].newValue as PartialSettingsInput);
  postSettings(newValue);
});

// Respond to requests from inject script
window.addEventListener('message', event => {
  if (event.source !== window) return;
  if (event.origin !== ALLOWED_ORIGIN) return;
  if (!event.isTrusted) return;

  const data = event.data as { source?: string; type?: string; nonce?: string };
  if (!data || typeof data !== 'object' || data.source !== MESSAGE_SOURCE) return;

  if (data.type === MESSAGE_TYPES.handshake && typeof data.nonce === 'string') {
    trustedNonce = data.nonce;
    void loadSettings().then(postSettings);
    postI18nMessages();
    return;
  }

  if (!trustedNonce || data.nonce !== trustedNonce) return;

  if (data.type === MESSAGE_TYPES.requestSettings) {
    void loadSettings().then(settings => postSettings(settings));
  }

  if (data.type === MESSAGE_TYPES.requestI18n) {
    postI18nMessages();
  }

  if (data.type === MESSAGE_TYPES.openSettings) {
    void chrome.runtime.sendMessage({ action: 'openSettings' });
  }
});

// Kick off handshake so inject script can learn the nonce
// Note: Handshake is initiated from inject script; content responds once nonce is received.
