import type { Feature } from '@/inject/types/global';
import { isWideScreen, sendEscapeLike, sleep, waitForElement } from '@/inject/utils/common';
import { cloneSettings, matchesShortcut } from '@/inject/utils/shortcuts';
import { DEFAULT_SETTINGS, type SettingsData } from '@/shared/settings';

/**
 * AddSources - Open "Add Sources" dialog with keyboard shortcut
 * - Cmd+U (Mac) / Ctrl+U (Windows): open add sources dialog
 * - Wide screen: click add source button directly
 * - Small screen: switch to Sources tab, then click button
 */
export class AddSources implements Feature {
  private isRunning = false;
  private settings: SettingsData = cloneSettings(DEFAULT_SETTINGS);

  updateSettings(settings: SettingsData): void {
    this.settings = cloneSettings(settings);
  }

  private runWideScreenFlow(): void {
    const collapsedBtn = document.querySelector<HTMLButtonElement>(
      'button.add-source-button-collapsed[aria-label="Add source"]',
    );
    if (collapsedBtn) {
      collapsedBtn.click();
      return;
    }

    const normalBtn = document.querySelector<HTMLButtonElement>(
      'button.add-source-button[aria-label="Add source"]',
    );
    if (normalBtn) {
      normalBtn.click();
      return;
    }

    console.warn('[Add Sources] Wide screen: Add source button not found.');
  }

  private async runSmallScreenFlow(): Promise<void> {
    let sourcesTab: Element | null = null;
    const tabs = document.querySelectorAll('[role="tab"]');

    for (const tab of tabs) {
      const text = (tab.textContent || '').trim();
      if (/^sources\b/i.test(text) || /sources/i.test(text)) {
        sourcesTab = tab;
        break;
      }
    }

    if (!sourcesTab) {
      console.warn('[Add Sources] Small screen: Sources tab not found.');
      return;
    }

    if (sourcesTab instanceof HTMLElement) {
      sourcesTab.click();
    }

    await sleep(200);

    try {
      const addSourceBtn = await waitForElement(
        'button.add-source-button[aria-label="Add source"]',
        {
          timeout: 5000,
          interval: 50,
        },
      );

      if (addSourceBtn instanceof HTMLElement) {
        addSourceBtn.click();
      }
    } catch (err) {
      console.error('[Add Sources] Small screen: Error finding Add source button.', err);
    }
  }

  private async runFlow(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      if (isWideScreen()) {
        this.runWideScreenFlow();
      } else {
        await this.runSmallScreenFlow();
      }
    } finally {
      this.isRunning = false;
    }
  }

  private onKeydown = (e: KeyboardEvent): void => {
    if (!matchesShortcut(e, 'addSources', this.settings)) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();

    sendEscapeLike();

    setTimeout(() => {
      void this.runFlow();
    }, 200);
  };

  init(): void {
    document.addEventListener('keydown', this.onKeydown, { capture: true, passive: false });
  }

  destroy(): void {
    document.removeEventListener('keydown', this.onKeydown, true);
  }
}
