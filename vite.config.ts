import { crx } from '@crxjs/vite-plugin';
import preact from '@preact/preset-vite';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

import manifest from './src/manifest/manifest.config';

const LOCALES_SRC = path.resolve(__dirname, '_locales');
const LOCALES_DEST = path.resolve(__dirname, 'dist/_locales');

function copyDirectoryRecursive(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;

  const entries = fs.readdirSync(src, { withFileTypes: true });
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function watchDirectory(plugin: { addWatchFile: (id: string) => void }, dir: string): void {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const targetPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      watchDirectory(plugin, targetPath);
    } else if (entry.isFile()) {
      plugin.addWatchFile(targetPath);
    }
  }
}

// Custom plugin to copy content style.css and fix HTML asset paths
function fixCrxBuildPlugin(): Plugin {
  return {
    name: 'fix-crx-build',
    buildStart() {
      watchDirectory(this, LOCALES_SRC);
    },
    writeBundle() {
      // Copy _locales to dist
      copyDirectoryRecursive(LOCALES_SRC, LOCALES_DEST);

      // Copy content style.css to dist
      const srcCss = path.resolve(__dirname, 'src/content/style.css');
      const destDir = path.resolve(__dirname, 'dist/src/content');
      const destCss = path.join(destDir, 'style.css');

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcCss, destCss);

      // Fix popup/index.html asset paths (remove leading /)
      const htmlPath = path.resolve(__dirname, 'dist/src/popup/index.html');
      if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf-8');
        // Replace /assets/ with ../../assets/
        html = html.replace(/href="\/assets\//g, 'href="../../assets/');
        html = html.replace(/src="\/assets\//g, 'src="../../assets/');
        fs.writeFileSync(htmlPath, html);
      }

      // Copy hashed inject bundle to root as inject.js for runtime injection
      // and fix relative import paths (from "./" to "./assets/")
      const assetsDir = path.resolve(__dirname, 'dist/assets');
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        const injectJs = files.find(file => /^inject-.*\.js$/.test(file));
        if (injectJs) {
          const srcBundle = path.join(assetsDir, injectJs);
          const destBundle = path.resolve(__dirname, 'dist/inject.js');
          // Read the bundle and fix import paths
          let bundleContent = fs.readFileSync(srcBundle, 'utf-8');
          // Fix relative imports: from"./foo.js" -> from"./assets/foo.js"
          bundleContent = bundleContent.replace(/from\s*"\.\/([^"]+)"/g, 'from"./assets/$1"');
          fs.writeFileSync(destBundle, bundleContent);
        }

        const injectMap = files.find(file => /^inject-.*\.js\.map$/.test(file));
        if (injectMap) {
          const srcMap = path.join(assetsDir, injectMap);
          const destMap = path.resolve(__dirname, 'dist/inject.js.map');
          fs.copyFileSync(srcMap, destMap);
        }
      }

      // Ensure manifest exposes inject.js and all built assets as web accessible resources
      const manifestPath = path.resolve(__dirname, 'dist/manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
          web_accessible_resources?: Array<{ resources?: string[]; matches?: string[] }>;
        };

        const assetDir = path.resolve(__dirname, 'dist/assets');
        const assetFiles = fs.existsSync(assetDir)
          ? fs.readdirSync(assetDir).filter(file => /\.js(\.map)?$/.test(file))
          : [];
        const resourcesToAdd = new Set<string>([
          'inject.js',
          ...assetFiles.map(file => `assets/${file}`),
        ]);

        manifest.web_accessible_resources = Array.isArray(manifest.web_accessible_resources)
          ? manifest.web_accessible_resources.map(entry => {
              if (!Array.isArray(entry.resources)) {
                return entry;
              }
              const merged = new Set(entry.resources);
              resourcesToAdd.forEach(res => merged.add(res));
              return { ...entry, resources: Array.from(merged) };
            })
          : [{ resources: Array.from(resourcesToAdd) }];

        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [preact(), crx({ manifest }), fixCrxBuildPlugin()],
    esbuild: isProd
      ? {
          drop: ['console', 'debugger'],
        }
      : undefined,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        input: {
          background: path.resolve(__dirname, 'src/background/index.ts'),
          content: path.resolve(__dirname, 'src/content/index.ts'),
          inject: path.resolve(__dirname, 'src/inject/index.ts'),
          popup: path.resolve(__dirname, 'src/popup/index.html'),
        },
      },
    },
  };
});
