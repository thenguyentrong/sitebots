import { readFile } from 'node:fs/promises';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured (for local work run the app with USE_LOCAL_DB=1 instead)');
}

const sources = await Promise.all([
  readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'),
  readFile(new URL('../db/views.sql', import.meta.url), 'utf8'),
]);
// Strip line comments before splitting: explanatory comments legitimately
// contain semicolons, and splitting those first manufactures invalid SQL.
const statements = sources
  .join('\n')
  .replace(/--.*$/gm, '')
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

const sql = neon(process.env.DATABASE_URL);
await sql.transaction(statements.map((statement) => sql.query(statement)));
console.log(`Applied ${statements.length} schema statements.`);
