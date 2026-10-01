import { readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const publicFiles = ['index.html', 'privacy.html', 'terms.html', 'refund.html', 'styles.css', 'legal.css', 'script.js', 'chat.js', 'demo.js', 'demo-data.mjs', 'robots.txt', 'sitemap.xml', 'CNAME'];
export async function checkSite() {
  for (const script of ['script.js', 'chat.js', 'demo.js', 'demo-data.mjs', 'backend/src/worker.js', 'scripts/check.mjs', 'scripts/build.mjs']) {
    const source = await readFile(resolve(root, script), 'utf8');
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: source, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`${script}: ${result.stderr}`);
  }
  for (const file of publicFiles) await access(resolve(root, file));
  for (const file of publicFiles.filter(file => file.endsWith('.html'))) {
    const html = await readFile(resolve(root, file), 'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    if (new Set(ids).size !== ids.length) throw new Error(`${file}: duplicate HTML id`);
    for (const [, raw] of html.matchAll(/\b(?:href|src|data-src)="([^"]+)"/g)) {
      if (/^(https?:|data:|mailto:|tel:)/.test(raw)) continue;
      const [path, fragment] = raw.split('#');
      const target = resolve(root, dirname(file), (path || file).split('?')[0]);
      if (!target.startsWith(root)) throw new Error(`${file}: invalid local path ${raw}`);
      await access(target).catch(() => { throw new Error(`${file}: missing local resource ${raw}`); });
      if (fragment) {
        const targetHtml = await readFile(target, 'utf8');
        if (!targetHtml.includes(`id="${fragment}"`)) throw new Error(`${file}: missing anchor ${raw}`);
      }
    }
    if (file === 'index.html') {
      for (const [, attrs, source] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
        if (/\bsrc=/.test(attrs)) continue;
        const hash = createHash('sha256').update(source).digest('base64');
        if (!html.includes(`'sha256-${hash}'`)) throw new Error('Inline script does not match the Content Security Policy hash');
      }
    }
  }
  console.log('Passed: JavaScript syntax, local resources, page anchors, unique IDs and CSP script hash.');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await checkSite();
