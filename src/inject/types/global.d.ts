// Feature interface - all features must implement
export interface Feature {
  init(): void;
  destroy(): void;
}

// Shortcut definition type
export interface ShortcutItem {
  item: string;
  shortcut: string;
}

// VimScroll state
export interface VimScrollState {
  direction: 'up' | 'down' | null;
  animationId: number | null;
  container: Element | null;
  key: string | null;
  prevScrollBehavior: string | null;
}

export interface NotebookLMFeatures {
  vimScroll: Feature;
  toggleHeader: Feature;
  addSources: Feature;
  toggleSideBars: Feature;
  deleteChatHistory: Feature;
  tabNavigation: Feature;
  shortcutHelpModal: Feature;
}

export interface NotebookLMCombined {
  features: NotebookLMFeatures;
  omnibarCleanup: (() => void) | null;
  destroy: () => void;
}

declare global {
  interface Window {
    __notebookLMCombined?: NotebookLMCombined;
    __nbOmnibarExtCleanup?: () => void;
    __nbcNonce?: string;
    __nbcAllowedOrigin?: string;
  }
}

// Constants
export const MIN_WIDE_WIDTH = 1051;
export const SCROLLING_SPEED = 20;
