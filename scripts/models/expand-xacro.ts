import './dom-polyfill';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { XacroParser } from 'xacro-parser';

/**
 * xacro → URDF in Node. `$(find pkg)` resolves through the packages map from
 * sources.json, `$(arg …)` through xacroArgs, `$(optenv …)` through the
 * environment with the default. Spot's description uses all three.
 */
export async function expandXacro(file: string, opts: { srcRoot: string; packages: Record<string, string>; args: Record<string, string> }): Promise<string> {
  const parser = new XacroParser();
  parser.workingPath = dirname(file).replace(/\\/g, '/') + '/';
  parser.arguments = { ...opts.args };
  parser.getFileContents = (p: string) => readFile(p.replace(/\\/g, '/'), 'utf8');
  parser.rospackCommands = {
    find: (pkg: string) => {
      const p = opts.packages[pkg];
      if (p === undefined) throw new Error(`$(find ${pkg}): package not in sources.json packages`);
      return join(opts.srcRoot, ...p.split('/')).replace(/\\/g, '/');
    },
    optenv: (name: string, ...dflt: string[]) => process.env[name] ?? dflt.join(' '),
    env: (name: string) => process.env[name] ?? '',
  };
  const xml = await readFile(file, 'utf8');
  const doc = await parser.parse(xml);
  return new XMLSerializer().serializeToString(doc as unknown as Node);
}
