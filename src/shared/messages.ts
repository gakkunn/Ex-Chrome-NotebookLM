export const MESSAGE_SOURCE = 'notebooklm-combined';

export const MESSAGE_TYPES = {
  requestSettings: 'nbc-request-settings',
  settings: 'nbc-settings',
  openSettings: 'nbc-open-settings',
  requestI18n: 'nbc-request-i18n',
  i18n: 'nbc-i18n',
  handshake: 'nbc-handshake',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export interface SettingsMessage<T = unknown> {
  source: typeof MESSAGE_SOURCE;
  type: MessageType;
  payload?: T;
  nonce?: string;
}
