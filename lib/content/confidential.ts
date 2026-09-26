import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * The public site carries industry facts, never the client behind them. The
 * terms that must not appear (names, people, figures from an engagement) live in
 * a git-ignored `.confidential-terms` file, one per line, `#` for comments. The
 * scan is a substring match, case-insensitive, over text files in the content
 * and code directories. Without the file the scan is empty and says so.
 */

export type ConfidentialHit = { file: string; line: number; term: string };

const TEXT = /\.(ts|tsx|mjs|js|md|ya?ml|json|css|txt|sql)$/;
const SKIP_DIRS = new Set(['node_modules', '.next', '.cache', 'snapshot', 'test-results']);
const MAX_BYTES = 2 * 1024 * 1024;

export function readTerms(root = process.cwd()): string[] | null {
  const p = join(root, '.confidential-terms');
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

export function scanConfidential(root = process.cwd(), dirs = ['data', 'app', 'components', 'lib', 'docs', 'scripts', 'tests']): { terms: string[] | null; hits: ConfidentialHit[] } {
  const terms = readTerms(root);
  if (!terms || terms.length === 0) return { terms, hits: [] };
  const lowered = terms.map((t) => t.toLowerCase());
  const hits: ConfidentialHit[] = [];
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (!SKIP_DIRS.has(name)) walk(p);
        continue;
      }
      if (!TEXT.test(name) || st.size > MAX_BYTES) continue;
      const lines = readFileSync(p, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        const low = line.toLowerCase();
        lowered.forEach((term, j) => {
          if (low.includes(term)) hits.push({ file: relative(root, p).replace(/\\/g, '/'), line: i + 1, term: terms[j] });
        });
      });
    }
  };
  for (const dir of dirs) walk(join(root, dir));
  return { terms, hits };
}
