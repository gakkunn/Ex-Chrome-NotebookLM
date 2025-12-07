import type { Feature } from '@/inject/types/global';
import { cloneSettings, matchesShortcut } from '@/inject/utils/shortcuts';
import { DEFAULT_SETTINGS, type SettingsData } from '@/shared/settings';

interface OmnibarState {
  omnibar: Element;
  input: HTMLTextAreaElement;
  ac: AbortController;
}

/**
 * OmnibarToggle - Toggle omnibar visibility with Shift+Space
 * - Shift+Space: toggle focus/visibility
 * - Hover: show
 * - Mouse leave: hide (unless focused)
 */
export class OmnibarToggle implements Feature {
  private state: OmnibarState | null = null;
  private observer: MutationObserver | null = null;
  private enabled = true;
  private settings: SettingsData = cloneSettings(DEFAULT_SETTINGS);
  private pendingEnsure = false;
  private getObserverRoot(): Element | null {
    return (
      document.querySelector('chat-panel') ||
      document.querySelector('.chat-panel') ||
      document.body ||
      document.documentElement
    );
  }
  private handleDomMutations = (): void => {
    if (this.hasLiveBinding()) return;
    this.scheduleEnsureBinding();
  };

  updateSettings(settings: SettingsData): void {
    this.settings = cloneSettings(settings);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    // Restore omnibar visibility when disabled
    if (this.state?.omnibar) {
      this.state.omnibar.classList.remove('omnibar-ext-hidden');
    }
  }

  private log(...args: unknown[]): void {
    console.log('[omnibar-ext]', ...args);
  }

  // Find textarea compatible with both DOM structures
  private findFirstOmnibar(): { omnibar: Element; input: HTMLTextAreaElement } | null {
    const omnibars = document.querySelectorAll('omnibar');
    if (!omnibars.length) return null;

    for (const omnibar of omnibars) {
      const input = omnibar.querySelector<HTMLTextAreaElement>(
        'textarea.query-box-input, textarea[aria-label="Query box"]',
      );
      if (input) {
        return { omnibar, input };
      }
    }
    return null;
  }

  private bindTo(found: { omnibar: Element; input: HTMLTextAreaElement }): void {
    const { omnibar, input } = found;

    // Skip if already bound to the same element
    if (this.state && this.state.omnibar === omnibar && this.state.input === input) {
      return;
    }

    // Destroy all previous listeners
    if (this.state?.ac) {
      this.state.ac.abort();
    }

    const ac = new AbortController();
    const { signal } = ac;

    // Initial state is hidden (controlled via CSS class)
    omnibar.classList.add('omnibar-ext-hidden');

    let hover = false;
    let isFocused = document.activeElement === input;

    const refreshOpacity = (): void => {
      const visible = hover || isFocused;
      if (visible) {
        omnibar.classList.remove('omnibar-ext-hidden');
      } else {
        omnibar.classList.add('omnibar-ext-hidden');
      }
    };

    // Shift + Space to toggle focus ON/OFF → toggle visibility
    const onKeydown = (e: KeyboardEvent): void => {
      // Skip if disabled
      if (!this.enabled) return;

      if (!matchesShortcut(e, 'toggleFocus', this.settings)) return;

      e.preventDefault();
      e.stopPropagation();

      if (isFocused) {
        // Currently focused → blur (hide)
        input.blur();
      } else {
        // Not focused → focus (show)
        hover = false; // Reset hover state since using keyboard
        input.focus();
      }
    };

    const onMouseEnter = (): void => {
      hover = true;
      refreshOpacity();
    };

    const onMouseLeave = (): void => {
      hover = false;
      refreshOpacity();
    };

    const onFocus = (): void => {
      isFocused = true;
      refreshOpacity();
    };

    const onBlur = (): void => {
      isFocused = false;
      refreshOpacity();
    };

    // Register listeners (via AbortController for easy cleanup later)
    document.addEventListener('keydown', onKeydown, { signal, passive: false });
    omnibar.addEventListener('mouseenter', onMouseEnter, { signal });
    omnibar.addEventListener('mouseleave', onMouseLeave, { signal });
    input.addEventListener('focus', onFocus, { signal });
    input.addEventListener('blur', onBlur, { signal });

    // Apply initial state
    refreshOpacity();

    this.state = { omnibar, input, ac };
    this.log('bound to', omnibar, input);
  }

  private hasLiveBinding(): boolean {
    return Boolean(
      this.state &&
      this.state.omnibar &&
      this.state.input &&
      this.state.omnibar.isConnected &&
      this.state.input.isConnected,
    );
  }

  private scheduleEnsureBinding = (): void => {
    if (this.pendingEnsure) return;
    if (this.hasLiveBinding()) return;
    this.pendingEnsure = true;

    const idle = (window as Window & { requestIdleCallback?: typeof requestIdleCallback })
      .requestIdleCallback;

    const schedule = idle ?? requestAnimationFrame;

    schedule(() => {
      this.pendingEnsure = false;
      this.ensureBinding();
    });
  };

  private ensureBinding = (): boolean => {
    const found = this.findFirstOmnibar();
    if (!found) {
      this.log('omnibar not found yet');
      return false;
    }
    this.bindTo(found);
    return true;
  };

  init(): void {
    // Clean up previous execution if any
    if (window.__nbOmnibarExtCleanup) {
      window.__nbOmnibarExtCleanup();
    }

    // Re-bind when DOM changes
    this.observer = new MutationObserver(this.handleDomMutations);

    const root = this.getObserverRoot();
    if (root) {
      this.observer.observe(root, { childList: true, subtree: true });
    }

    // Also re-check on resize
    window.addEventListener('resize', this.scheduleEnsureBinding);

    // Initial binding
    this.ensureBinding();

    // Save cleanup function for re-execution
    window.__nbOmnibarExtCleanup = () => this.destroy();

    console.log('[NotebookLM Shortcut Extension] Omnibar toggle enabled');
  }

  destroy(): void {
    if (this.state?.ac) {
      this.state.ac.abort();
    }
    this.observer?.disconnect();
    window.removeEventListener('resize', this.scheduleEnsureBinding);
    window.__nbOmnibarExtCleanup = undefined;
    this.log('cleaned up');
  }
}
