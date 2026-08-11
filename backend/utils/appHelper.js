import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getAppIdByName(appName) {
  const filePath = path.join(__dirname, '..', 'config', 'all_apps.json');
  const rawData = fs.readFileSync(filePath, 'utf8');
  const apps = JSON.parse(rawData);

  for (const item of apps) {
    const key = Object.keys(item)[0];
    if (key.toLowerCase() === appName.toLowerCase()) {
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

