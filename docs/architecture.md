# Architecture Overview

NotebookLM Shortcut Effective Extension is an MV3 Chrome extension that splits `src/` by responsibility. `@crxjs/vite-plugin` generates the manifest from TypeScript and bundles each entry (background/content/inject/popup) with Rollup.

## Build Pipeline

1. Declare `src/manifest/manifest.config.ts` with `defineManifest`.
2. Vite (`vite.config.ts`) loads `@preact/preset-vite` and `crx({ manifest })`, and defines each entry in `build.rollupOptions.input`.
3. `npm run dev` enables HMR/watch, and `npm run build` produces production artifacts in `dist/`.
4. Static assets such as icons are copied from `public/` to `dist/`, and locale files are recursively copied from `_locales/` to `dist/_locales/` by the Vite plugin.

## Runtime Modules

| Directory        | Role                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/background` | MV3 service worker that receives `openSettings` from the content script and calls `chrome.runtime.openOptionsPage()`.                                                         |
| `src/content`    | Content script that bridges `chrome.storage` and `window.postMessage`, and injects `inject.js` into the page.                                                                 |
| `src/inject`     | Features executed on the NotebookLM page. Each `features/*` implements the `Feature` interface; `index.ts` bootstraps and applies settings.                                   |
| `src/popup`      | Preact-based settings UI. `App.tsx` calls `loadSettings` / `saveSettings`, detects shortcut conflicts, resets defaults, and manages toggles.                                  |
| `src/shared`     | Centralizes the settings schema (`settings.ts` + `feature-flags.ts`), storage utilities (`storage.ts`), and messaging constants (`messages.ts`), referenced via the `@/` alias. |

## Settings & Messaging Flow

1. Settings changed in the Popup are saved via `saveSettings` → `chrome.storage.sync`.
2. The content script (`src/content/index.ts`) watches `chrome.storage.onChanged` and forwards diffs to the inject script through `window.postMessage`.
3. The inject script (`src/inject/index.ts`) checks `MESSAGE_SOURCE`, applies updates with `mergeSettings`, and each feature class provides `updateSettings` / `enable` / `disable` to update the DOM when needed.
4. When the inject side needs settings, it sends `MESSAGE_TYPES.requestSettings` through `window.postMessage`, and the content script replies with the latest settings.

## Styling Strategy

- Content script CSS is consolidated in `src/content/style.css` and injected via the manifest `css` entry.
- The Popup imports `src/popup/style.css` through Vite; the UI is dark-themed and responsive.

## Testing

- **Unit (Vitest)**: Verifies setting merges and utilities (e.g., `tests/unit/settings.spec.ts`). `tests/unit/setup.ts` runs Testing Library `cleanup`.
- **E2E (Playwright)**: `tests/e2e/fixtures/extension.ts` loads the built extension with `chromium.launchPersistentContext`, and `tests/e2e/popup.spec.ts` checks Popup UI rendering. CI pre-installs dependencies with `npx playwright install --with-deps chromium`.

## Release / CI

- `scripts/prepare-release.mjs` packages `dist/` into `notebooklm-combined.zip`, attached by `release.yml` to GitHub Releases.
- `ci.yml` runs on Node 18 with `npm ci`, `lint/test/build/test:e2e`, and installs Playwright dependencies to catch regressions.

## Future Enhancements

- Expand `docs/architecture.md` with per-feature sequence diagrams.
- Add Chrome Web Store CLI upload scripts under `scripts/`.
- Localize the Popup UI (currently English) and support multiple shortcuts per setting.
