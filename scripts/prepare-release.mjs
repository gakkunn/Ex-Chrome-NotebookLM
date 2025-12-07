import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const distDir = path.join(projectRoot, 'dist');
const artifactName = 'notebooklm-combined.zip';
const artifactPath = path.join(projectRoot, artifactName);

if (!fs.existsSync(distDir)) {
  throw new Error('dist/ not found. Please run "npm run build" first.');
}

if (fs.existsSync(artifactPath)) {
  fs.rmSync(artifactPath);
}

console.log(`🗜️  Creating release archive -> ${artifactName}`);
execSync(`cd "${distDir}" && zip -r "${artifactPath}" .`, { stdio: 'inherit' });
console.log('✅ Release archive created');

