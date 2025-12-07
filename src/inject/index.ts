import { MESSAGE_SOURCE, MESSAGE_TYPES } from '@/shared/messages';
import { DEFAULT_SETTINGS, mergeSettings } from '@/shared/settings';
import type { PartialSettingsInput, SettingsData } from '@/shared/settings';

import { AddSources } from './features/add-sources';
import { CtrlEnterSend } from './features/ctrl-enter-send';
import { DeleteChatHistory } from './features/delete-chat';
import { OmnibarToggle } from './features/omnibar-toggle';
import { ShortcutHelpModal } from './features/shortcuts-dialog';
import { TabNavigation } from './features/tab-navigation';
import { ToggleHeader } from './features/toggle-header';
import { ToggleSideBars } from './features/toggle-sidebars';
import { VimScroll } from './features/vim-scroll';
import type { NotebookLMCombined, NotebookLMFeatures } from './types/global';
import { setMessages } from './utils/i18n';

const ALLOWED_ORIGIN = 'https://notebooklm.google.com';
const INJECT_NONCE = self.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
let trustedNonce: string | null = null;

if (typeof window !== 'undefined') {
  window.__nbcNonce = INJECT_NONCE;
  window.__nbcAllowedOrigin = ALLOWED_ORIGIN;
}

let settings: SettingsData = { ...DEFAULT_SETTINGS };
let ctrlEnterSend: CtrlEnterSend;
let omnibarToggle: OmnibarToggle;
let features: NotebookLMFeatures;

// Receive settings
function setupSettingsBridge(): void {
  window.addEventListener('message', event => {
    if (event.source !== window) return;
    if (event.origin !== ALLOWED_ORIGIN) return;
    if (!event.isTrusted) return;

    const data = event.data as {
      source?: string;
      type?: string;
      payload?: unknown;
      nonce?: string;
    };
    if (!data || typeof data !== 'object' || data.source !== MESSAGE_SOURCE) return;

    if (data.type === MESSAGE_TYPES.handshake && data.nonce === INJECT_NONCE) {
      trustedNonce = data.nonce;
      window.postMessage(
        { source: MESSAGE_SOURCE, type: MESSAGE_TYPES.requestSettings, nonce: INJECT_NONCE },
        ALLOWED_ORIGIN,
      );
      window.postMessage(
        { source: MESSAGE_SOURCE, type: MESSAGE_TYPES.requestI18n, nonce: INJECT_NONCE },
        ALLOWED_ORIGIN,
      );
      return;
    }

    if (!trustedNonce || data.nonce !== trustedNonce) return;

    if (data.type === MESSAGE_TYPES.settings && data.payload) {
      applySettings(mergeSettings(data.payload as PartialSettingsInput));
    }

    if (data.type === MESSAGE_TYPES.i18n && data.payload && typeof data.payload === 'object') {
      setMessages(data.payload as Record<string, string>);
      const modal = features?.shortcutHelpModal as { onLocaleChange?: () => void } | undefined;
      if (modal?.onLocaleChange) {
        modal.onLocaleChange();
      }
    }
  });

  window.postMessage(
    { source: MESSAGE_SOURCE, type: MESSAGE_TYPES.handshake, nonce: INJECT_NONCE },
    ALLOWED_ORIGIN,
  );
}

// Apply settings
function applySettings(next: SettingsData): void {
  settings = next;
  console.log('[NotebookLM Shortcut Extension] Settings applied:', settings);

  omnibarToggle?.updateSettings(settings);

  // Enable/disable safeSend feature
  if (settings.featureToggles.safeSend) {
    ctrlEnterSend?.enable?.();
  } else {
    ctrlEnterSend?.disable?.();
  }

  // Enable/disable wideScreen feature
  if (settings.featureToggles.wideScreen) {
    omnibarToggle?.enable?.();
    document.body.classList.add('nbc-wide-screen-enabled');
  } else {
    omnibarToggle?.disable?.();
    document.body.classList.remove('nbc-wide-screen-enabled');
  }

  // Update vimScroll feature
  if (features?.vimScroll && 'updateSettings' in features.vimScroll) {
    (features.vimScroll as { updateSettings: (s: SettingsData) => void }).updateSettings(settings);
  }

  // Update toggleHeader feature
  if (features?.toggleHeader && 'updateSettings' in features.toggleHeader) {
    (features.toggleHeader as { updateSettings: (s: SettingsData) => void }).updateSettings(
      settings,
    );
  }

  // Update addSources feature
  if (features?.addSources && 'updateSettings' in features.addSources) {
    (features.addSources as { updateSettings: (s: SettingsData) => void }).updateSettings(settings);
  }

  // Update toggleSideBars feature
  if (features?.toggleSideBars && 'updateSettings' in features.toggleSideBars) {
    (features.toggleSideBars as { updateSettings: (s: SettingsData) => void }).updateSettings(
      settings,
    );
  }

  // Update deleteChatHistory feature
  if (features?.deleteChatHistory && 'updateSettings' in features.deleteChatHistory) {
    (features.deleteChatHistory as { updateSettings: (s: SettingsData) => void }).updateSettings(
      settings,
    );
  }

  // Update tabNavigation feature
  if (features?.tabNavigation && 'updateSettings' in features.tabNavigation) {
    (features.tabNavigation as { updateSettings: (s: SettingsData) => void }).updateSettings(
      settings,
    );
  }

  // Update shortcutHelpModal feature
  if (features?.shortcutHelpModal && 'updateSettings' in features.shortcutHelpModal) {
    (features.shortcutHelpModal as { updateSettings: (s: SettingsData) => void }).updateSettings(
      settings,
    );
  }
}

function initNotebookLM(): void {
  // Setup settings bridge first
  setupSettingsBridge();

  // Initialize ctrl+enter and omnibar first (these are IIFEs in original)
  ctrlEnterSend = new CtrlEnterSend();
  omnibarToggle = new OmnibarToggle();

  ctrlEnterSend.init();
  omnibarToggle.init();

  // Initialize all other features
  features = {
    vimScroll: new VimScroll(),
    toggleHeader: new ToggleHeader(),
    addSources: new AddSources(),
    toggleSideBars: new ToggleSideBars(),
    deleteChatHistory: new DeleteChatHistory(),
    tabNavigation: new TabNavigation(),
    shortcutHelpModal: new ShortcutHelpModal(),
  };

  (Object.keys(features) as Array<keyof NotebookLMFeatures>).forEach(key => {
    features[key].init();
  });

  // Setup global cleanup mechanism
  const combined: NotebookLMCombined = {
    features,
    omnibarCleanup: window.__nbOmnibarExtCleanup || null,
    destroy() {
      ctrlEnterSend.destroy();
      omnibarToggle.destroy();
      (Object.keys(this.features) as Array<keyof NotebookLMFeatures>).forEach(key => {
        this.features[key].destroy();
      });
      if (this.omnibarCleanup) {
        this.omnibarCleanup();
      }
    },
  };

  window.__notebookLMCombined = combined;

  console.log('[NotebookLM Shortcut Extension] All features loaded successfully');
}

// Wait for DOM if needed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotebookLM);
} else {
  initNotebookLM();
}
