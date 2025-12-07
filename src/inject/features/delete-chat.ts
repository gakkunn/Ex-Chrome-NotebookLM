import type { Feature } from '@/inject/types/global';
import { isWideScreen, sendEscapeLike, sleep, waitForElement } from '@/inject/utils/common';
import { cloneSettings, matchesShortcut } from '@/inject/utils/shortcuts';
import { DEFAULT_SETTINGS, type SettingsData } from '@/shared/settings';

/**
 * DeleteChatHistory - Delete chat history with keyboard shortcut (wide screen only)
 * - Cmd+Shift+Delete (Mac) / Ctrl+Shift+Delete (Windows): open delete dialog
 * - Multi-step flow: Chat options → menu → delete button
 * - If dialog already open, just focus the delete button
 */
export class DeleteChatHistory implements Feature {
  private isRunning = false;
  private settings: SettingsData = cloneSettings(DEFAULT_SETTINGS);

  updateSettings(settings: SettingsData): void {
    this.settings = cloneSettings(settings);
  }

  private async runDeleteHistoryFlow(): Promise<void> {
    if (!isWideScreen()) return;
    if (this.isRunning) return;

    this.isRunning = true;

    try {
      // Check if delete dialog is already open
      const existingDeleteBtn = document.querySelector<HTMLButtonElement>(
        '.delete-chat-history-dialog button.yes-button',
      );
      if (existingDeleteBtn) {
        existingDeleteBtn.focus();
        existingDeleteBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // Step 1: Click Chat options button
      const chatOptionsBtn = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Chat options"]',
      );
      if (!chatOptionsBtn) {
        console.warn('[Delete Chat History] Chat options button not found.');
        return;
      }

      chatOptionsBtn.click();
      await sleep(150);

      // Step 2: Click menu panel or delete menu item
      const menuPanel = await waitForElement(
        '.mat-mdc-menu-panel.chat-history-menu, .mat-mdc-menu-panel',
        {
          timeout: 5000,
          interval: 50,
        },
      );

      let deleteMenuItem: Element | null = null;
      const candidates = menuPanel.querySelectorAll('button, [role="menuitem"], [mat-menu-item]');

      for (const el of candidates) {
        const text = (el.textContent || '').trim();
        if (!text) continue;
        if (/delete chat history/i.test(text)) {
          deleteMenuItem = el;
          break;
        }
      }

      if (deleteMenuItem && deleteMenuItem instanceof HTMLElement) {
        deleteMenuItem.click();
      } else if (menuPanel instanceof HTMLElement) {
        menuPanel.click();
      }

      await sleep(200);

      // Step 3: Focus on delete button in dialog
      const deleteBtn = await waitForElement('.delete-chat-history-dialog button.yes-button', {
        timeout: 8000,
        interval: 50,
      });

      if (deleteBtn instanceof HTMLElement) {
        deleteBtn.focus();
        deleteBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (err) {
      console.error('[Delete Chat History] Error during flow:', err);
    } finally {
      this.isRunning = false;
    }
  }

  private onKeydown = (e: KeyboardEvent): void => {
    if (!isWideScreen()) return;
    if (!matchesShortcut(e, 'deleteChat', this.settings)) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();

    sendEscapeLike();

    setTimeout(() => {
      void this.runDeleteHistoryFlow();
    }, 200);
  };

  init(): void {
    document.addEventListener('keydown', this.onKeydown, { capture: true, passive: false });
  }

  destroy(): void {
    document.removeEventListener('keydown', this.onKeydown, true);
  }
}
