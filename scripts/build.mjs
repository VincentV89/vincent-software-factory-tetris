// Zero-dependency static build: copies the playable site into dist/.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('index.html', 'dist/index.html');
cpSync('src', 'dist/src', { recursive: true });
console.log('Built dist/ (open dist/index.html or serve the folder)');
