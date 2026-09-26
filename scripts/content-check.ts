// Validate the decision-journey content without a database.
//
//   npm run content -- --check
//
// Loads data/taxonomy, data/settings, data/tasks, data/compliance, data/costs,
// data/reference and data/partners through the zod schemas, recomputes every
// pinned task verdict with the screen engine, checks references between files
// and German completeness, then scans for confidential terms. Exit 1 on any issue.

import { scanConfidential } from '@/lib/content/confidential';
import { checkContent, loadContent, type Content } from '@/lib/content/load';

function summary(c: Content) {
  const screened = c.settings.filter((s) => s.coverage === 'screened').length;
  console.log(`${c.settings.length} settings (${screened} screened, ${c.settings.length - screened} scaffold)`);
  console.log(`${c.families.length} families, ${c.trades.length} trades, ${c.machineClasses.length} machine classes, ${c.solutionClasses.length} solution classes`);
  const bySetting = new Map<string, Record<string, number>>();
  for (const { record } of c.tasks) {
    const row = bySetting.get(record.setting) ?? {};
    row[record.screen.verdict] = (row[record.screen.verdict] ?? 0) + 1;
    bySetting.set(record.setting, row);
  }
  console.log(`${c.tasks.length} task records`);
  for (const [setting, row] of bySetting) {
    const parts = Object.entries(row).map(([verdict, n]) => `${n} ${verdict}`);
    console.log(`  ${setting}: ${parts.join(', ')}`);
  }
  console.log(`${c.compliance.length} compliance entries, ${c.costs.lines.length} cost lines, ${c.roadmap.phases.length} roadmap phases, ${c.rfi.items.length} RFI items, ${c.pilotMetrics.length} pilot metrics, ${c.humanoidLimits.length} limits, ${c.partners.length} partners`);
}

function main() {
  let content: Content;
  try {
    content = loadContent();
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
  summary(content);

  const issues = checkContent(content);
  if (issues.length) {
    console.error(`\n${issues.length} issue(s):`);
    for (const i of issues) console.error(`  ${i}`);
  } else {
    console.log('content: no issues');
  }

  const scan = scanConfidential();
  if (scan.terms === null) console.log('confidential: no .confidential-terms file, scan skipped');
  else if (scan.hits.length) {
    console.error(`\nconfidential: ${scan.hits.length} hit(s)`);
    for (const h of scan.hits) console.error(`  ${h.file}:${h.line} contains "${h.term}"`);
  } else console.log(`confidential: ${scan.terms.length} term(s), no hits`);

  process.exit(issues.length || scan.hits.length ? 1 : 0);
}

main();
