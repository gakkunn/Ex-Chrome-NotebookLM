import type { Feature } from '@/inject/types/global';
import { cloneSettings, matchesShortcut } from '@/inject/utils/shortcuts';
import { DEFAULT_SETTINGS, type SettingsData } from '@/shared/settings';

/**
 * ToggleHeader - Toggle page headers visibility
 * - Cmd/Ctrl+Shift+S: toggle header visibility
 * - Responsive: different margins for small/wide screens
 */
export class ToggleHeader implements Feature {
  private isVisible = true;
  private settings: SettingsData = cloneSettings(DEFAULT_SETTINGS);

  updateSettings(settings: SettingsData): void {
    this.settings = cloneSettings(settings);
  }

  private getPanelContainer(): HTMLElement | null {
    const el =
      document.querySelector<HTMLElement>('.panel-container.ng-tns-c2305779123-0') ||
      document.querySelector<HTMLElement>('.panel-container');

    if (!el) return null;

    const currentTransition = getComputedStyle(el).transition || '';
    if (!currentTransition.includes('margin-top')) {
      el.style.transition =
        (currentTransition && currentTransition !== 'all 0s ease 0s'
          ? currentTransition + ', '
          : '') + 'margin-top 0.25s ease';
    }

    return el;
  }

  private applyState(): void {
    // Toggle headers
    const notebookHeader = document.querySelector<HTMLElement>('notebook-header');
    const googleBar = document.querySelector<HTMLElement>('.boqOnegoogleliteOgbOneGoogleBar');
    const targets = [notebookHeader, googleBar].filter((el): el is HTMLElement => el !== null);

    targets.forEach(el => {
      if (this.isVisible) {
        const h = el.scrollHeight || Number(el.dataset._toggleMaxHeight) || 0;
        el.style.maxHeight = h + 'px';
        el.style.opacity = '1';
        el.style.pointerEvents = '';
      } else {
        el.style.maxHeight = '0px';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      }
    });

    // Adjust panel-container margin
    const panelContainer = this.getPanelContainer();
    if (panelContainer) {
      const isSmall = window.innerWidth <= 1050;

      if (this.isVisible) {
        if (isSmall) {
          panelContainer.style.marginTop = '64px';
        } else {
          panelContainer.style.marginTop = '0px';
        }
      } else {
        if (isSmall) {
          panelContainer.style.marginTop = '0px';
        } else {
          panelContainer.style.marginTop = '10px';
        }
      }
    }
  }

  private setupHeaderStyles(): void {
    const notebookHeader = document.querySelector<HTMLElement>('notebook-header');
    const googleBar = document.querySelector<HTMLElement>('.boqOnegoogleliteOgbOneGoogleBar');
    const targets = [notebookHeader, googleBar].filter((el): el is HTMLElement => el !== null);

    if (!targets.length) return;

    targets.forEach(el => {
      const rect = el.getBoundingClientRect();
      const h = rect.height || el.scrollHeight || el.offsetHeight;

      el.style.overflow = 'hidden';
      el.style.maxHeight = h + 'px';
      el.style.opacity = '1';
      el.style.transition = 'none';
      el.dataset._toggleMaxHeight = String(h);

      setTimeout(() => {
        el.style.transition = 'max-height 0.25s ease, opacity 0.25s ease';
        el.style.willChange = 'max-height, opacity';
      }, 0);
    });
  }

  private onKeydown = (e: KeyboardEvent): void => {
    if (!matchesShortcut(e, 'toggleHeader', this.settings)) return;

    e.preventDefault();
    e.stopPropagation();

    this.isVisible = !this.isVisible;
    this.applyState();
  };

  private onResize = (): void => {
    this.applyState();
  };

  init(): void {
    this.setupHeaderStyles();
    this.applyState();
    window.addEventListener('keydown', this.onKeydown, { passive: false });
    window.addEventListener('resize', this.onResize);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeydown);
    window.removeEventListener('resize', this.onResize);
  }
}
