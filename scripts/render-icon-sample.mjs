// Render and validate the review sample, without modifying the application's icon library.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { SYMBOLS } from '../shared/symbols.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function renderPack({ directory, expectedCount, archive }) {
  const output = resolve(root, 'muestra-de-iconos', directory);
  const manifest = JSON.parse(await readFile(resolve(output, 'catalogo.json'), 'utf8'));
  const icons = manifest.icons;
  assert.equal(icons.length, expectedCount);
  assert.equal(new Set(icons.map(i => i.id)).size, expectedCount);
  assert.equal(manifest.designs, expectedCount);
  assert.equal(manifest.svgFiles, expectedCount * 2);
  assert.deepEqual(manifest.variants, ['claro', 'oscuro']);
  if (manifest.view === 'original') {
    assert.deepEqual(icons.slice(0, 173).map(i => i.id), SYMBOLS.map(i => i.id));
    assert.equal(icons.filter(i => i.origin === 'addition').length, 7);
    assert.equal(icons[173].id, 'cowbell');
  } else {
    const initial = JSON.parse(await readFile(resolve(root, 'muestra-de-iconos/familia-gordostage-v1/catalogo.json'), 'utf8'));
    for (const icon of icons) assert(initial.icons.some(i => i.id === icon.id && i.label === icon.label));
    if (expectedCount === 180) {
      const identity = list => list.map(({ id, label, category, number }) => ({ id, label, category, number }));
      assert.deepEqual(identity(icons), identity(initial.icons), 'Both complete views must cover the same numbered concepts');
    }
  }
  for (const theme of manifest.variants) {
    const files = (await readdir(resolve(output, theme))).filter(name => name.endsWith('.svg')).sort();
    assert.deepEqual(files, icons.map(i => `${i.id}.svg`).sort(), 'One standalone SVG per concept and theme');
  }
  const documents = [];
  for (const icon of icons) {
    for (const theme of ['claro', 'oscuro']) {
      const source = await readFile(resolve(output, icon.files[theme]), 'utf8');
      assert(!/<(?:image|script|foreignObject)\b|(?:href|url\()|<!DOCTYPE/i.test(source), `Non-vector or external content: ${icon.id}`);
      documents.push({ id: icon.id, theme, source });
    }
  }
  if (manifest.view === 'cenital' && expectedCount === 180) {
    const approvedDirectory = resolve(root, 'muestra-de-iconos/cenital-20');
    const approved = JSON.parse(await readFile(resolve(approvedDirectory, 'catalogo.json'), 'utf8'));
    for (const icon of approved.icons) {
      for (const theme of manifest.variants) {
        assert.equal(await readFile(resolve(output, icon.files[theme]), 'utf8'), await readFile(resolve(approvedDirectory, icon.files[theme]), 'utf8'), `Preserve the approved SVG: ${theme}/${icon.id}`);
      }
    }
  }

  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://sample.local').pathname);
      const file = resolve(output, '.' + pathname);
      if (!file.startsWith(output + sep)) { res.writeHead(403).end(); return; }
      const source = await readFile(file);
      const type = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' }[extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type }); res.end(source);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    const validation = await page.evaluate(documents => {
      const shapeKeys = node => [node.tagName, [...node.attributes].filter(a => !['fill', 'stroke'].includes(a.name)).map(a => [a.name, a.value]), [...node.children].map(shapeKeys)];
      const result = [], geometry = new Map(), duplicates = [];
      const holder = document.createElement('div');
      holder.style.cssText = 'position:absolute;left:-10000px;top:0';
      document.body.append(holder);
      for (const { id, theme, source } of documents) {
        const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
        if (svg.querySelector('parsererror') || svg.tagName === 'parsererror') throw new Error('Invalid SVG: ' + id);
        holder.replaceChildren(document.importNode(svg, true));
        const art = holder.querySelector('#art');
        const box = art.getBBox();
        const signature = JSON.stringify(shapeKeys(art));
        if (theme === 'claro') {
          if (geometry.has(signature)) duplicates.push([id, geometry.get(signature)]);
          geometry.set(signature, id);
        } else if (geometry.get(signature) !== id) throw new Error('Theme geometry differs: ' + id);
        result.push({ id, theme, x: box.x, y: box.y, right: box.x + box.width, bottom: box.y + box.height, width: box.width, height: box.height });
      }
      holder.remove();
      return { boxes: result, duplicates };
    }, documents);
    const clipped = validation.boxes.filter(b => b.x < 2 || b.y < 2 || b.right > 98 || b.bottom > 98 || b.width < 10 || b.height < 10);
    assert.deepEqual(clipped, [], 'Artwork must fit the 100 × 100 viewport with stroke margin');
    assert.deepEqual(validation.duplicates, [], 'Every concept must have distinct geometry');

    async function decoded() {
      await page.evaluate(async () => {
        await Promise.all([...document.images].map(img => img.decode()));
        if ([...document.images].some(img => !img.complete || !img.naturalWidth)) throw new Error('A sample image did not decode');
        await document.fonts.ready;
      });
    }
    await decoded();
    assert.equal(await page.locator('.icon').count(), expectedCount);
    await page.locator('#search').fill(manifest.view === 'original' ? 'cencerro' : 'guitarra acustica');
    assert.equal(await page.locator('.icon').count(), 1);
    await page.locator('#search').fill('MICROFONO');
    assert((await page.locator('.icon').count()) >= 1, 'Search should ignore accents and case');
    await page.locator('#search').fill('');
    const filter = manifest.view === 'original' ? 'Conectores y cableado' : 'Cuerdas';
    await page.locator('#category').selectOption(filter);
    assert.equal(await page.locator('.icon').count(), icons.filter(i => i.category === filter).length);
    await page.locator('#theme').click();
    await decoded();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'oscuro');
    assert((await page.locator('.icon img').first().getAttribute('src')).startsWith('oscuro/'));
    await page.locator('#size').selectOption('32');
    assert.equal(await page.locator('.icon img').first().evaluate(img => getComputedStyle(img).width), '32px');

    // Validate all 360 standalone SVG files through the browser's image decoder.
    const decodedCount = await page.evaluate(async documents => {
      await Promise.all(documents.map(({ source }) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(img.src); resolve(); };
        img.onerror = reject;
        img.src = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
      })));
      return documents.length;
    }, documents);
    assert.equal(decodedCount, expectedCount * 2);
    await mkdir(resolve(output, 'laminas'), { recursive: true });
    const categories = [...new Set(icons.map(i => i.category))];
    const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    for (const theme of ['claro', 'oscuro']) {
      if (manifest.view === 'cenital' && expectedCount === 20) {
        await page.setViewportSize({ width: 1500, height: 1000 });
        await page.goto(`${base}?${new URLSearchParams({ theme, sheet: 'sample' })}`);
        await decoded();
        await page.locator('main').screenshot({ path: resolve(output, `laminas/cenital-${theme}.png`) });
        continue;
      }
      await page.setViewportSize({ width: 1800, height: 1000 });
      await page.goto(`${base}?${new URLSearchParams({ theme, sheet: 'all' })}`);
      await decoded();
      await page.locator('main').screenshot({ path: resolve(output, `laminas/catalogo-${theme}.png`) });
      await page.setViewportSize({ width: 1500, height: 1000 });
      for (const category of categories) {
        await page.goto(`${base}?${new URLSearchParams({ theme, category, sheet: 'category' })}`);
        await decoded();
        await page.locator('main').screenshot({ path: resolve(output, `laminas/${theme}-${slug(category)}.png`) });
      }
    }
    // Managed Chromium blocks file:// navigation. Check local dependencies statically
    // and exercise all gallery behavior over HTTP; do not claim a native-file browser test.
    const nativeFileCheck = 'not run: managed browser blocks file URLs';
    await page.goto(base);
    await decoded();
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Gallery must fit a phone viewport');
    assert.deepEqual(errors, [], 'Gallery JavaScript errors');

    const zipPath = resolve(root, 'muestra-de-iconos', archive);
    execFileSync('python3', ['-c', `
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import sys
root=Path(sys.argv[1]); target=Path(sys.argv[2])
files=sorted(f for f in root.rglob('*') if f.is_file())
with ZipFile(target,'w',compression=ZIP_DEFLATED) as z:
    for f in files:
        info=ZipInfo(root.name+'/'+f.relative_to(root).as_posix())
        info.compress_type=ZIP_DEFLATED
        info.external_attr=0o100644 << 16
        z.writestr(info,f.read_bytes())
with ZipFile(target) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if n.endswith('.svg')])==int(sys.argv[3])
`, output, zipPath, String(expectedCount * 2)]);
    console.log(JSON.stringify({ pack: directory, designs: icons.length, svgDecoded: decodedCount, distinctDesigns: expectedCount, matchingThemeGeometry: true, preservedApprovedSvg: manifest.view === 'cenital' && expectedCount === 180 ? 40 : undefined, previews: expectedCount === 20 ? 2 : categories.length * 2 + 2, galleryChecks: ['search', 'accent-insensitive search', 'category filter', 'theme switch', 'size switch', 'mobile'], nativeFileCheck, zipBytes: (await stat(zipPath)).size }, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }

}
const packs = {
  original: { directory: 'familia-gordostage-v1', expectedCount: 180, archive: 'gordostage-180-iconos-claro-oscuro.zip' },
  referencia: { directory: 'cenital-20', expectedCount: 20, archive: 'gordostage-muestra-20-cenitales.zip' },
  cenital: { directory: 'familia-gordostage-cenital-v1', expectedCount: 180, archive: 'gordostage-180-cenitales-claro-oscuro.zip' },
};
const requested = process.argv.slice(2);
assert(requested.length <= 1 && (!requested.length || /^--pack=(original|referencia|cenital)$/.test(requested[0])), 'Use --pack=original, --pack=referencia or --pack=cenital, or omit it to render all packs');
for (const key of requested.length ? [requested[0].slice('--pack='.length)] : Object.keys(packs)) await renderPack(packs[key]);
