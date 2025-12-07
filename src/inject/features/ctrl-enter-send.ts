import { isMac, isModKey } from '@/shared/keyboard';

import type { Feature } from '../types/global';

/**
 * CtrlEnterSend - Modifies Enter key behavior in NotebookLM input
 * - Enter: newline only
 * - Cmd/Ctrl+Enter: send message
 */
export class CtrlEnterSend implements Feature {
  private enabled = true;

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    // Skip if disabled (let NotebookLM default behavior handle it)
    if (!this.enabled) return;
    // Target: query-box-input textarea inside omnibar
    const target = e.target;

    if (
      !(target instanceof HTMLTextAreaElement) ||
      !target.classList.contains('query-box-input') ||
      !target.closest('omnibar')
    ) {
      return;
    }

    // Ignore non-Enter keys
    if (e.key !== 'Enter') return;

    // Cmd/Ctrl+Enter → send message
    const isMacCtrlEnter = isMac() && e.ctrlKey;
    if (isModKey(e) || isMacCtrlEnter) {
      // Cancel original key event and replace with send action
      e.preventDefault(); // Prevent newline insertion
      e.stopPropagation(); // Kill NotebookLM's "Enter to send" handler

      const form = target.closest('form');
      const submitButton = form?.querySelector<HTMLButtonElement>(
        'button.submit-button[type="submit"]:not([disabled])',
      );

      if (submitButton) {
        submitButton.click();
      }
      return;
    }

    // Plain Enter (+ Shift, etc.) → only insert newline
    // Keep default newline behavior, just prevent sending
    e.stopPropagation(); // Prevent event from reaching NotebookLM
    // Don't call preventDefault so textarea still inserts newline
  };

  init(): void {
    // Capture phase allows us to handle before the app
    document.addEventListener('keydown', this.handleKeydown, { capture: true, passive: false });
    console.log('[NotebookLM Shortcut Extension] Ctrl+Enter handler enabled');
  }

  destroy(): void {
    document.removeEventListener('keydown', this.handleKeydown, true);
  }
}
