// Writes data/market/use-case-index.json: every published use case the map can show, so
// research records can tag their evidence with ids that exist.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContent } from '@/lib/content/load';
import { taskCards } from '@/lib/tasks/cards';

const content = loadContent();
const settings = new Map(content.settings.map((setting) => [setting.id, setting.title.en]));
const rows = taskCards(content).map((task) => ({
  id: task.id, title: task.title.en, family: task.family, setting: settings.get(task.setting) ?? task.setting, industries: task.industries,
}));
const dir = join(process.cwd(), 'data/discovery-opportunities');
for (const file of readdirSync(dir).filter((name) => name.endsWith('.json')).sort()) {
  const batch = JSON.parse(readFileSync(join(dir, file), 'utf8').replace(/^﻿/, ''));
  for (const item of batch.opportunities) rows.push({ id: item.id, title: item.title, family: item.family, setting: item.setting, industries: item.industries });
}
writeFileSync(join(process.cwd(), 'data/market/use-case-index.json'), JSON.stringify({ generated: 'npm run market:index', count: rows.length, useCases: rows }, null, 1) + '\n');
console.log(rows.length + ' use cases');
