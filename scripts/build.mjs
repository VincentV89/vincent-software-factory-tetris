// Copies the static site from src/ to dist/. No bundler needed.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
cpSync(join(root, 'src'), out, { recursive: true });
console.log(`Built site into ${out}`);
