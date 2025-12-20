import type { Feature } from '@/inject/types/global';
import { isWideScreen } from '@/inject/utils/common';
import { cloneSettings, matchesShortcut } from '@/inject/utils/shortcuts';
import { DEFAULT_SETTINGS, type SettingsData } from '@/shared/settings';

/**
 * TabNavigation - Navigate tabs with keyboard (small screen only)
 * - Cmd/Ctrl+. : next tab
 * - Cmd/Ctrl+, : previous tab
 */
export class TabNavigation implements Feature {
  private settings: SettingsData = cloneSettings(DEFAULT_SETTINGS);

  updateSettings(settings: SettingsData): void {
    this.settings = cloneSettings(settings);
  }

  private onKeydown = (e: KeyboardEvent): void => {
    if (isWideScreen()) return;
    if (matchesShortcut(e, 'toggleRightSidebar', this.settings)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      this.moveTab('next');
      return;
    }

    if (matchesShortcut(e, 'toggleLeftSidebar', this.settings)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      this.moveTab('prev');
    }
  };

  private moveTab(direction: 'next' | 'prev'): void {
    const header = document.querySelector('mat-tab-header');
    if (!header) return;

    const tabs = Array.from(header.querySelectorAll<HTMLElement>('[role="tab"]'));
    if (!tabs.length) return;

    let currentIndex = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    if (currentIndex === -1) currentIndex = 0;

    let nextIndex = currentIndex;

    nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % tabs.length
        : (currentIndex - 1 + tabs.length) % tabs.length;

    tabs[nextIndex].click();
  }

  init(): void {
    window.addEventListener('keydown', this.onKeydown, { capture: true, passive: false });
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeydown, true);
  }
}
