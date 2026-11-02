// Dependency-free lint: syntax-check every JS file and sanity-check the HTML references.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
for (const dir of ['src', 'test', 'scripts']) {
  for (const f of readdirSync(join(root, dir))) {
    if (/\.(m?js)$/.test(f)) files.push(join(root, dir, f));
  }
}
let failed = false;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    failed = true;
    console.error(`Syntax error in ${f}:\n${e.stderr}`);
  }
}
const html = readFileSync(join(root, 'src/index.html'), 'utf8');
for (const [, ref] of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) {
  if (!existsSync(join(root, 'src', ref))) {
    failed = true;
    console.error(`index.html references missing file: ${ref}`);
  }
}
if (failed) process.exit(1);
console.log(`Lint OK (${files.length} JS files checked)`);
