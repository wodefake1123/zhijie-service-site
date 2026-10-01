import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { checkSite, root, publicFiles } from './check.mjs';

await checkSite();
const output = resolve(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of [...publicFiles, 'assets']) {
  await cp(resolve(root, file), resolve(output, file), { recursive: true });
}
console.log('Built static site in dist/. GitHub Pages continues to publish main from the repository root.');
