export type FeatureToggleKey = 'vimScroll' | 'wideScreen' | 'safeSend' | 'otherShortcuts';

export const FEATURE_TOGGLE_LABELS: Record<
  FeatureToggleKey,
  { key: string; defaultMessage: string }
> = {
  vimScroll: { key: 'toggle_vimScroll', defaultMessage: 'Vim-like Scroll' },
  wideScreen: { key: 'toggle_wideScreen', defaultMessage: 'Wide Screen' },
  safeSend: { key: 'toggle_safeSend', defaultMessage: 'Send with Cmd/Ctrl + Enter' },
  otherShortcuts: { key: 'toggle_otherShortcuts', defaultMessage: 'Other Shortcuts' },
};

export const DEFAULT_FEATURE_TOGGLES: Record<FeatureToggleKey, boolean> = {
  vimScroll: true,
  wideScreen: true,
  safeSend: true,
  otherShortcuts: true,
};

export const FEATURE_TOGGLE_KEYS: FeatureToggleKey[] = [
  'vimScroll',
  'wideScreen',
  'safeSend',
  'otherShortcuts',
];
