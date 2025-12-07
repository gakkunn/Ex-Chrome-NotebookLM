import { DEFAULT_SETTINGS, STORAGE_KEY, mergeSettings } from './settings';
import type { PartialSettingsInput, SettingsData } from './settings';

export async function loadSettings(): Promise<SettingsData> {
  return new Promise(resolve => {
    try {
      chrome.storage.sync.get(STORAGE_KEY, data => {
        if (chrome.runtime.lastError) {
          console.warn(
            '[NotebookLM Shortcut Extension] Failed to load settings:',
            chrome.runtime.lastError,
          );
          resolve({ ...DEFAULT_SETTINGS });
          return;
        }

        const raw = data?.[STORAGE_KEY] as PartialSettingsInput | undefined;
        resolve(mergeSettings(raw));
      });
    } catch (error) {
      console.error('[NotebookLM Shortcut Extension] Error loading settings:', error);
      resolve({ ...DEFAULT_SETTINGS });
    }
  });
}

export async function saveSettings(update: PartialSettingsInput): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(STORAGE_KEY, data => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        const existing = mergeSettings((data?.[STORAGE_KEY] as PartialSettingsInput) ?? {});
        const merged: SettingsData = mergeSettings({
          ...existing,
          ...update,
          featureToggles: { ...existing.featureToggles, ...(update.featureToggles ?? {}) },
          shortcuts: { ...existing.shortcuts, ...(update.shortcuts ?? {}) },
        });

        chrome.storage.sync.set({ [STORAGE_KEY]: merged }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          console.log('[NotebookLM Shortcut Extension] Settings saved:', merged);
          resolve();
        });
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
