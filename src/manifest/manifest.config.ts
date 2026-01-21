import { defineManifest } from '@crxjs/vite-plugin';

const matches = ['https://notebooklm.google.com/*'];

export default defineManifest({
  manifest_version: 3,
  name: '__MSG_app_name_full__',
  short_name: '__MSG_app_name_short__',
  description: '__MSG_app_description__',
  version: '1.2.0',
  default_locale: 'en',
  permissions: ['storage'],
  action: {
    default_popup: 'src/popup/index.html',
    default_title: '__MSG_action_title__',
  },
  options_page: 'src/popup/index.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  commands: {
    reload_extension_dev: {
      suggested_key: {
        default: 'Ctrl+Shift+R',
        mac: 'Command+Shift+R',
      },
      description: 'Reload the extension during development',
    },
  },
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  content_scripts: [
    {
      matches,
      js: ['src/content/index.ts'],
      css: ['src/content/style.css'],
      run_at: 'document_start',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['src/inject/index.ts', 'assets/*'],
      matches,
    },
  ],
});
