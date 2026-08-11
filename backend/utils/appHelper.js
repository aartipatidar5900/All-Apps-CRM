import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getAppIdByName(appName) {
  if (!appName) return null;
  const filePath = path.join(__dirname, '..', 'config', 'all_apps.json');
  const rawData = fs.readFileSync(filePath, 'utf8');
  const apps = JSON.parse(rawData);

  const normalize = (str) => str.toLowerCase().replace(/[-_\s]/g, '');
  const target = normalize(appName);

  for (const item of apps) {
    const key = Object.keys(item)[0];
    if (normalize(key) === target) {
      return item[key];
    }
  }
  return null;
}

export function getAllApps() {
  const filePath = path.join(__dirname, '..', 'config', 'all_apps.json');
  const rawData = fs.readFileSync(filePath, 'utf8');
  const apps = JSON.parse(rawData);
  return apps.map(item => {
    const key = Object.keys(item)[0];
    return { name: key, appId: item[key] };
  });
}

