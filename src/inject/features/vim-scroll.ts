import type { Feature, VimScrollState } from '@/inject/types/global';
import { SCROLLING_SPEED, isEditableElement } from '@/inject/utils/common';
import { getBindings, matchesShortcut } from '@/inject/utils/shortcuts';
import type { SettingsData, ShortcutId } from '@/shared/settings';

type ScrollType = 'top' | 'bottom' | 'up' | 'down' | 'halfUp' | 'halfDown';

/**
 * VimScroll - Vim-like keyboard scrolling
 * - j/k: scroll up/down with smooth animation
 * - J/K (Shift): scroll half page
 * - Cmd/Ctrl+j/k: jump to top/bottom
 * - Hold key: continuous scroll
 */
export class VimScroll implements Feature {
  private state: VimScrollState = {
    direction: null,
    animationId: null,
    container: null,
    key: null,
    prevScrollBehavior: null,
  };
  private settings: SettingsData | null = null;
  private hotKeyCache: Set<string> = new Set();

  updateSettings(settings: SettingsData): void {
    this.settings = settings;
    this.refreshHotKeyCache(settings);
  }

  private refreshHotKeyCache(settings: SettingsData | null): void {
    this.hotKeyCache.clear();
    if (!settings) return;

    const ids: ShortcutId[] = [
      'scrollTop',
      'scrollBottom',
      'scrollUp',
      'scrollDown',
      'scrollHalfUp',
      'scrollHalfDown',
    ];

    ids.forEach(id => {
      const bindings = getBindings(settings, id);
      bindings.forEach(binding => {
        if (binding.key) {
          this.hotKeyCache.add(binding.key.toLowerCase());
        }
      });
    });
  }

  private getScrollContainer(): Element {
    // NotebookLM: Chat panel takes priority
    const notebook = document.querySelector('.chat-panel-content');
    if (notebook) return notebook;

    // Fallback to generic scroll container detection
    const huge =
      document.querySelector('div[data-test-id="chat-history-container"]') ||
      document.querySelector('div.chat-history') ||
      document.querySelector('div.flex.flex-col.text-sm.thread-xl\\:pt-header-height.pb-25') ||
      document.querySelector('div.flex.flex-col.text-sm');

    let container: Element = document.scrollingElement || document.documentElement || document.body;

    if (huge) {
      let cur: Element | null = huge;
      while (cur && cur !== document.body) {
        const st = getComputedStyle(cur as HTMLElement);
        if (/(auto|scroll)/.test(st.overflowY) && cur.scrollHeight > cur.clientHeight + 8) {
          container = cur;
          break;
        }
        cur = cur.parentElement;
      }
    }
    return container;
  }

  private ensureScrollBehaviorAuto(container: Element | null): void {
    if (!container || !(container instanceof HTMLElement)) return;

    const computed = getComputedStyle(container).scrollBehavior;
    if (computed && computed !== 'auto' && this.state.prevScrollBehavior === null) {
      this.state.prevScrollBehavior = computed;
      container.style.setProperty('scroll-behavior', 'auto', 'important');
    }
  }

  private startContinuousScroll(container: Element, direction: 'up' | 'down'): void {
    this.stopContinuousScroll();

    this.state.direction = direction;
    this.state.container = container;

    const scroll = (): void => {
      if (this.state.direction === direction && this.state.container) {
        const delta = direction === 'up' ? -SCROLLING_SPEED : SCROLLING_SPEED;
        this.state.container.scrollTop += delta;
        this.state.animationId = requestAnimationFrame(scroll);
      }
    };

    this.state.animationId = requestAnimationFrame(scroll);
  }

  private stopContinuousScroll(): void {
    this.state.direction = null;
    this.state.container = null;
    if (this.state.animationId !== null) {
      cancelAnimationFrame(this.state.animationId);
      this.state.animationId = null;
    }
  }

  private animateScroll(container: Element, targetTop: number, duration: number): void {
    const start = container.scrollTop;
    const change = targetTop - start;
    const startTime = performance.now();

    const easeInOutQuad = (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeInOutQuad(progress);

      container.scrollTop = start + change * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  private handleVimScroll(e: KeyboardEvent, type: ScrollType): boolean {
    if (isEditableElement(document.activeElement)) return false;

    const container = this.getScrollContainer();
    const isContainerChanged = this.state.container && this.state.container !== container;

    if (isContainerChanged) {
      this.state.prevScrollBehavior = null;
    }

    this.state.container = container;
    this.ensureScrollBehaviorAuto(container);

    e.preventDefault();
    e.stopPropagation();

    const STEP = 60;
    const STEP_REPEAT = 15;
    const DURATION_FAST = 100;
    const DURATION_SMOOTH = 200;

    let targetTop: number;

    switch (type) {
      case 'top':
        targetTop = 0;
        break;
      case 'bottom':
        targetTop = container.scrollHeight - container.clientHeight;
        break;
      case 'up':
        targetTop = container.scrollTop - (e.repeat ? STEP_REPEAT : STEP);
        break;
      case 'down':
        targetTop = container.scrollTop + (e.repeat ? STEP_REPEAT : STEP);
        break;
      case 'halfUp':
        targetTop = container.scrollTop - window.innerHeight / 2;
        break;
      case 'halfDown':
        targetTop = container.scrollTop + window.innerHeight / 2;
        break;
      default:
        return false;
    }

    targetTop = Math.max(0, Math.min(targetTop, container.scrollHeight - container.clientHeight));

    if (type === 'up' || type === 'down') {
      if (!e.repeat) {
        this.animateScroll(container, targetTop, DURATION_FAST);
        this.state.key = e.key;
        setTimeout(() => {
          if (this.state.key === e.key && this.state.direction === null) {
            this.startContinuousScroll(container, type);
          }
        }, DURATION_FAST);
      } else if (this.state.direction === null) {
        this.startContinuousScroll(container, type);
      }
    } else {
      if (e.repeat) {
        container.scrollTop = targetTop;
      } else {
        this.animateScroll(container, targetTop, DURATION_SMOOTH);
      }
    }

    return true;
  }

  private onKeydown = (e: KeyboardEvent): void => {
    if (!this.settings?.featureToggles.vimScroll) return;
    if (isEditableElement(e.target) || isEditableElement(document.activeElement)) return;

    const key = (e.key || '').toLowerCase();
    if (key && this.hotKeyCache.size && !this.hotKeyCache.has(key)) return;

    if (matchesShortcut(e, 'scrollTop', this.settings)) {
      if (this.handleVimScroll(e, 'top')) return;
    }

    if (matchesShortcut(e, 'scrollBottom', this.settings)) {
      if (this.handleVimScroll(e, 'bottom')) return;
    }

    if (matchesShortcut(e, 'scrollUp', this.settings)) {
      if (this.handleVimScroll(e, 'up')) return;
    }

    if (matchesShortcut(e, 'scrollDown', this.settings)) {
      if (this.handleVimScroll(e, 'down')) return;
    }

    if (matchesShortcut(e, 'scrollHalfUp', this.settings)) {
      if (this.handleVimScroll(e, 'halfUp')) return;
    }

    if (matchesShortcut(e, 'scrollHalfDown', this.settings)) {
      if (this.handleVimScroll(e, 'halfDown')) return;
    }
  };

  private onKeyup = (e: KeyboardEvent): void => {
    if (e.key === this.state.key) {
      this.stopContinuousScroll();
      this.state.key = null;
    }
  };

  private onResize = (): void => {
    this.state.direction = null;
    this.state.animationId = null;
    this.state.container = null;
    this.state.prevScrollBehavior = null;
  };

  init(): void {
    document.addEventListener('keydown', this.onKeydown, { capture: true, passive: false });
    document.addEventListener('keyup', this.onKeyup, { capture: true, passive: false });
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  destroy(): void {
    this.stopContinuousScroll();
    document.removeEventListener('keydown', this.onKeydown, { capture: true });
    document.removeEventListener('keyup', this.onKeyup, { capture: true });
    window.removeEventListener('resize', this.onResize);
    this.state.key = null;

    if (
      this.state.prevScrollBehavior &&
      this.state.container &&
      this.state.container instanceof HTMLElement
    ) {
      this.state.container.style.setProperty(
        'scroll-behavior',
        this.state.prevScrollBehavior,
        'important',
      );
    }
  }
}
