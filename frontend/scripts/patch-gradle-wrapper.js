/* global process */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GRADLE_VERSION = '9.3.1';
const DISTRIBUTION_URL = `https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`;

const nodeModules = path.join(__dirname, '..', 'node_modules', '@capacitor');

if (!fs.existsSync(nodeModules)) {
  console.log('[patch-gradle-wrapper] No @capacitor packages found, skipping.');
  process.exit(0);
}

const capacitorPackages = fs.readdirSync(nodeModules);
let patchedCount = 0;

for (const pkg of capacitorPackages) {
  const propsFile = path.join(
    nodeModules,
    pkg,
    'android',
    'gradle',
    'wrapper',
    'gradle-wrapper.properties'
  );

  if (!fs.existsSync(propsFile)) continue;

  let content = fs.readFileSync(propsFile, 'utf8');
  const regex = /^distributionUrl=.*$/m;

  if (regex.test(content)) {
    const newContent = content.replace(regex, `distributionUrl=${DISTRIBUTION_URL}`);
    if (newContent !== content) {
      fs.writeFileSync(propsFile, newContent, 'utf8');
      patchedCount++;
      console.log(`[patch-gradle-wrapper] Patched: @capacitor/${pkg}`);
    } else {
      console.log(`[patch-gradle-wrapper] Already up-to-date: @capacitor/${pkg}`);
    }
  }
}

console.log(`[patch-gradle-wrapper] Done. ${patchedCount} file(s) patched to gradle-${GRADLE_VERSION}.`);
