// Runs after `vite build`: lists every file in dist/ and writes the list + a version into dist/sw.js.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = 'dist';
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const files = walk(dist)
  .map((f) => relative(dist, f).replaceAll('\\', '/'))
  .filter((f) => f !== 'sw.js' && f !== 'sound-lab.html')
  // Fonts ship in many language subsets; keep only the Latin ones offline.
  .filter((f) => !f.endsWith('.woff2') || /latin-wght/.test(f));
const urls = ['./', ...files.map((f) => `./${f}`)];
const version = createHash('sha1').update(urls.map((u) => u + (u === './' ? '' : statSync(join(dist, u)).size)).join()).digest('hex').slice(0, 10);
const sw = readFileSync(join(dist, 'sw.js'), 'utf8').replace('/*PRECACHE*/[]', JSON.stringify(urls)).replace('__VERSION__', version);
writeFileSync(join(dist, 'sw.js'), sw);
console.log(`sw.js: precaching ${urls.length} files (version ${version})`);
