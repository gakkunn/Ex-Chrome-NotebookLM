import type { Feature } from '@/inject/types/global';
import { isWideScreen } from '@/inject/utils/common';
import { cloneSettings, matchesShortcut } from '@/inject/utils/shortcuts';
import { DEFAULT_SETTINGS, type SettingsData } from '@/shared/settings';

/**
 * ToggleSideBars - Toggle left/right sidebars (wide screen only)
 * - Cmd/Ctrl+, : toggle left sidebar (source panel)
 * - Cmd/Ctrl+. : toggle right sidebar (studio panel)
 */
export class ToggleSideBars implements Feature {
  private settings: SettingsData = cloneSettings(DEFAULT_SETTINGS);

  updateSettings(settings: SettingsData): void {
    this.settings = cloneSettings(settings);
  }

  private clickSourcePanelButton(): void {
    const btn = document.querySelector<HTMLButtonElement>('button.toggle-source-panel-button');
    if (!btn) {
      console.warn('[Toggle Side Bars] toggle-source-panel-button not found.');
      return;
    }
    btn.click();
  }

  private clickStudioPanelButton(): void {
    const btn = document.querySelector<HTMLButtonElement>('button.toggle-studio-panel-button');
    if (!btn) {
      console.warn('[Toggle Side Bars] toggle-studio-panel-button not found.');
      return;
    }
    btn.click();
  }

  private onKeydown = (e: KeyboardEvent): void => {
    if (!isWideScreen()) return;
    if (matchesShortcut(e, 'toggleLeftSidebar', this.settings)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      this.clickSourcePanelButton();
      return;
    }

    if (matchesShortcut(e, 'toggleRightSidebar', this.settings)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      this.clickStudioPanelButton();
      return;
    }
  };

  init(): void {
    window.addEventListener('keydown', this.onKeydown, { passive: false });
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeydown);
  }
}
