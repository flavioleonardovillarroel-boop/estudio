const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert/strict');
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require('C:/Users/leo_v/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const { chromium } = playwright;
const { pwaResources, waitForWorker } = require('./helpers/pwa-resources.cjs');
const root = path.resolve(__dirname, '..');
const output = process.env.ESTUDIO_TEST_OUTPUT || path.join(root, 'test-results');
const entries = [
  { label: 'main', prefix: '/estudio/', resources: pwaResources(root) },
  { label: 'source', prefix: '/source/', resources: pwaResources(root, { sourceMode: true }) }
];
const required = ['pjt.js', 'pjt.css', 'materiales/pjt/manual.pdf', 'materiales/pjt/presentacion.pdf',
  'materiales/pjt/guia.docx', 'materiales/pjt/video-regla.mp4', 'materiales/pjt/video-planeamiento.mp4'];
const mission = ['m_quien', 'm_que', 'm_cuando', 'm_donde', 'm_para', 'm_fin', 'm_superior'];
const injection = '<img src=x onerror="window.__pjtXss=1"><svg onload="window.__pjtXss=2"></svg> & " literal';
const report = [];
let releaseCache;
const cacheGate = new Promise(resolve => { releaseCache = resolve; });
let holdCache = true;

for (const entry of entries) {
  for (const file of required) assert(entry.resources.cachedFiles.has(file), `${entry.label}: missing precache ${file}`);
  entry.images = [...entry.resources.cachedFiles].filter(file => /^materiales\/pjt\/lamina-[^/]+\.webp$/.test(file));
  assert.equal(entry.images.length, 5, `${entry.label}: five PJT sheets must be precached`);
  entry.material = [...entry.resources.cachedFiles].filter(file => file.startsWith('materiales/pjt/'));
}

// The allowlist, filenames and MIME types come from the actual service-worker precache.
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const entry = entries.find(item => pathname.startsWith(item.prefix));
    const file = entry && entry.resources.resolveRequest(pathname.slice(entry.prefix.length));
    if (!entry || file === null) { res.writeHead(404); return res.end(); }
    if (holdCache && entry.label === 'main' && file === 'materiales/pjt/video-regla.mp4') await cacheGate;
    const bytes = fs.readFileSync(entry.resources.pathFor(file));
    const headers = { 'Content-Type': entry.resources.mimeFor(file), 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      const start = match ? Number(match[1]) : -1;
      const end = match && match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
      if (!match || start > end || start < 0 || start >= bytes.length) {
        res.writeHead(416, { ...headers, 'Content-Range': `bytes */${bytes.length}` }); return res.end();
      }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': end - start + 1 });
      return res.end(bytes.subarray(start, end + 1));
    }
    res.writeHead(200, { ...headers, 'Content-Length': bytes.length });
    res.end(bytes);
  } catch (error) { if (!res.headersSent) res.writeHead(500); res.end(error.message); }
});

function pass(message) { report.push(message); console.log('PASS: ' + message); }
async function createProfile(page, name, pin) {
  await page.locator('#nuevoNom').fill(name);
  await page.locator('#nuevoPin').fill(pin);
  await page.getByRole('button', { name: 'Crear y entrar', exact: true }).click();
  await page.locator('.materia').first().waitFor();
  return page.evaluate(() => ({ uid: estUid(), key: 'est_' + KEYU() + 'pjt_notas_v1' }));
}
async function login(page, uid, pin) {
  await page.locator('#selUsuario').selectOption(uid);
  await page.locator('#selPin').fill(pin);
  await page.getByRole('button', { name: 'Entrar 🍀', exact: true }).click();
  await page.locator('.materia').first().waitFor();
}
async function openPjt(page, via = 'materia') {
  await page.evaluate(via => via === 'materia' ? abrirMateria('m_pjt') : abrirTema('pjt_auxiliar'), via);
  await page.locator('#pjtRoot').waitFor();
  assert.equal(await page.locator('#pjtRoot').getByRole('button', { name: /examen/i }).count(), 0);
}
async function section(page, name) {
  await page.locator(`#pjtRoot [data-pjt-go="${name}"]`).first().click();
}
async function noOverflow(page, label) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: horizontal overflow at 390px`);
}
async function saved(page) {
  await page.waitForFunction(() => /guardad/i.test(document.querySelector('#pjtSaveStatus')?.textContent || ''));
}
async function cachedCompletely(page, entry) {
  await waitForWorker(page, 60000);
  await page.waitForFunction(prefix => navigator.serviceWorker.controller?.scriptURL.includes(prefix), entry.prefix);
  await page.waitForFunction(async ({ name, paths, prefix }) => {
    const cache = await caches.open(name);
    return (await Promise.all(paths.map(file => cache.match(prefix + file)))).every(Boolean);
  }, { name: entry.resources.cache, paths: [...entry.resources.cachedFiles], prefix: entry.prefix }, { timeout: 60000 });
  await page.waitForFunction(() => {
    const text = document.querySelector('#pjtOffline')?.textContent || '';
    return /disponible|list[oa]|complet/i.test(text) && !/no disponible|preparando|pendiente|descargando/i.test(text);
  }, null, { timeout: 15000 });
}

async function darkContrast(page) {
  await page.evaluate(() => { LS.set('est_tema', 'oscuro'); aplicarTema(); });
  assert(await page.locator('html').evaluate(el => el.classList.contains('dark')));
  const failures = await page.locator('#pjtRoot').evaluate(root => {
    const rgb = text => {
      const values = text.match(/[\d.]+/g)?.map(Number);
      return values && values.length >= 3 ? [...values.slice(0, 3), values.length > 3 ? values[3] : 1] : [0, 0, 0, 0];
    };
    const over = (front, back) => [...front.slice(0, 3).map((value, i) => value * front[3] + back[i] * (1 - front[3])), 1];
    const background = element => {
      const chain = []; for (let node = element; node; node = node.parentElement) chain.push(node);
      return chain.reverse().reduce((color, node) => over(rgb(getComputedStyle(node).backgroundColor), color), [255, 255, 255, 1]);
    };
    const luminance = color => color.slice(0, 3).map(value => {
      value /= 255; return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4);
    }).reduce((total, value, i) => total + value * [.2126, .7152, .0722][i], 0);
    return [...root.querySelectorAll('h1,h2,h3,p,label,button,a,textarea,input')].filter(el => el.getClientRects().length && (el.textContent.trim() || el.value)).flatMap(el => {
      const css = getComputedStyle(el), bg = background(el), fg = over(rgb(css.color), bg);
      const a = luminance(fg), b = luminance(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const size = parseFloat(css.fontSize), large = size >= 24 || (size >= 18.66 && parseInt(css.fontWeight, 10) >= 700);
      return ratio + .01 < (large ? 3 : 4.5) ? [{ text: (el.textContent || el.value).trim().slice(0, 60), ratio }] : [];
    });
  });
  assert.deepEqual(failures, [], 'PJT text and form controls must meet WCAG AA contrast in dark mode');
}

async function offlineResources(page, entry, context, base) {
  await section(page, 'recursos');
  for (const file of entry.material) {
    const expected = fs.readFileSync(entry.resources.pathFor(file));
    const response = await page.evaluate(async url => {
      const response = await fetch(url);
      const bytes = new Uint8Array(await response.arrayBuffer());
      return { status: response.status, bytes: bytes.length, type: response.headers.get('content-type'), first: [...bytes.slice(0, 16)] };
    }, entry.prefix + file);
    assert.equal(response.status, 200, `${entry.label}: offline ${file}`);
    assert.equal(response.bytes, expected.length, `${entry.label}: complete offline ${file}`);
    assert.deepEqual(response.first, [...expected.subarray(0, 16)], `${entry.label}: correct bytes ${file}`);
    assert(response.type?.startsWith(entry.resources.mimeFor(file).split(';')[0]), `${file}: MIME ${response.type}`);
    if (/\.(pdf|docx)$/.test(file)) {
      const links = page.locator('#pjtRoot a[download]');
      const matches = await links.evaluateAll((elements, file) => elements.map((el, index) => ({ index, path: new URL(el.href).pathname })).filter(el => el.path.endsWith('/' + file)), file);
      assert.equal(matches.length, 1, `${file}: one explicit download link`);
      const [download] = await Promise.all([page.waitForEvent('download'), links.nth(matches[0].index).click()]);
      assert.equal(await download.failure(), null, `${file}: download works offline`);
      assert.equal(path.extname(download.suggestedFilename()), path.extname(file));
    }
    if (file.endsWith('.mp4')) {
      const range = await page.evaluate(async url => {
        const response = await fetch(url, { headers: { Range: 'bytes=0-127' } });
        return { status: response.status, range: response.headers.get('content-range'), bytes: [...new Uint8Array(await response.arrayBuffer())] };
      }, entry.prefix + file);
      assert.equal(range.status, 206, `${file}: offline range must return 206`);
      assert.equal(range.range, `bytes 0-127/${expected.length}`);
      assert.equal(range.bytes.length, 128);
      assert.deepEqual(range.bytes, [...expected.subarray(0, 128)]);
      const suffix = await page.evaluate(async url => {
        const response = await fetch(url, { headers: { Range: 'bytes=-128' } });
        return { status: response.status, range: response.headers.get('content-range'), bytes: [...new Uint8Array(await response.arrayBuffer())] };
      }, entry.prefix + file);
      assert.equal(suffix.status, 206, `${file}: offline suffix range must return 206`);
      assert.equal(suffix.range, `bytes ${expected.length - 128}-${expected.length - 1}/${expected.length}`);
      assert.deepEqual(suffix.bytes, [...expected.subarray(expected.length - 128)]);
      const invalid = await page.evaluate(async ({ url, size }) => {
        const response = await fetch(url, { headers: { Range: `bytes=${size}-` } });
        return { status: response.status, range: response.headers.get('content-range'), bytes: (await response.arrayBuffer()).byteLength };
      }, { url: entry.prefix + file, size: expected.length });
      assert.equal(invalid.status, 416, `${file}: range beyond EOF must return 416`);
      assert.equal(invalid.range, `bytes */${expected.length}`);
      assert.equal(invalid.bytes, 0);
    }
  }
  // PDF navigation must return the PDF itself, never the cached application shell.
  for (const file of entry.material.filter(file => file.endsWith('.pdf'))) {
    const pdf = await context.newPage();
    try {
      let response;
      try { response = await pdf.goto(base + entry.prefix + file, { waitUntil: 'commit' }); }
      catch (error) {
        // Some Chromium builds start a native PDF download instead of a viewer.
        if (!/ERR_ABORTED|Download is starting/i.test(error.message)) throw error;
      }
      if (response) { assert.equal(response.status(), 200); assert.match(response.headers()['content-type'], /^application\/pdf/); }
    } finally { await pdf.close(); }
  }
  const videos = page.locator('#pjtRoot video');
  assert.equal(await videos.count(), entry.material.filter(file => file.endsWith('.mp4')).length);
  for (let index = 0; index < await videos.count(); index++) {
    const video = videos.nth(index);
    assert(await video.evaluate(el => el.controls && !el.autoplay && el.paused), 'Native video controls; no autoplay');
    await video.evaluate(el => { el.preload = 'metadata'; el.load(); });
    await page.waitForFunction(index => {
      const video = document.querySelectorAll('#pjtRoot video')[index];
      return video?.readyState >= 1 || video?.error;
    }, index);
    const metadata = await video.evaluate(el => ({ duration: el.duration, error: el.error?.message, canPlay: el.canPlayType('video/mp4') }));
    assert.equal(metadata.error, undefined, 'Video metadata must load offline');
    assert(Number.isFinite(metadata.duration) && metadata.duration > 0, 'Video has a finite positive duration');
    assert(metadata.canPlay, 'Test browser must support the provided MP4 videos');
    {
      const target = Math.min(1, metadata.duration / 2);
      await video.evaluate((el, target) => { el.currentTime = target; }, target);
      await page.waitForFunction(({ index, target }) => {
        const video = document.querySelectorAll('#pjtRoot video')[index];
        return !video.seeking && Math.abs(video.currentTime - target) < .15 && video.readyState >= 2;
      }, { index, target });
      assert(await video.evaluate(el => el.paused), 'Seeking must not start playback');
      // Seek alone does not prove decoding/playback. Start muted playback offline
      // and require the media clock to advance before explicitly pausing it.
      try {
        const startedAt = await video.evaluate(async el => {
          el.muted = true;
          el.currentTime = 0;
          await el.play();
          return el.currentTime;
        });
        await page.waitForFunction(({ index, startedAt }) => {
          const video = document.querySelectorAll('#pjtRoot video')[index];
          return !video.paused && !video.error && video.currentTime > startedAt + .25;
        }, { index, startedAt });
      } finally { await video.evaluate(el => el.pause()); }
      assert(await video.evaluate(el => el.paused), 'Playback can be paused after advancing offline');
    }
  }
  pass(`${entry.label}: all PJT files, downloads, PDF navigation, actual video playback/seeking, prefix/suffix ranges and 416 work offline`);
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const entry of entries) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
      const errors = [], external = [];
      context.on('request', request => { if (!request.url().startsWith(base + '/') && /^https?:/.test(request.url())) external.push(request.url()); });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on('pageerror', error => errors.push(error.message));
      try {
        const url = base + entry.prefix + (entry.label === 'source' ? entry.resources.entry : '');
        await page.goto(url);
        const first = await createProfile(page, `PJT ${entry.label} uno`, '1234');
        await openPjt(page);
        if (entry.label === 'main') {
          assert(await page.evaluate(async ({ name, file }) => !(await (await caches.open(name)).match(file)), { name: entry.resources.cache, file: entry.prefix + 'materiales/pjt/video-regla.mp4' }));
          const pending = await page.locator('#pjtOffline').innerText();
          assert(/prepar|descarg|pendiente|no disponible|sin completar|aún|todav/i.test(pending), `Incomplete precache must not claim availability: ${pending}`);
          holdCache = false; releaseCache();
        }
        await cachedCompletely(page, entry);
        await page.locator('#pjtBack').click();
        await page.locator('.materia').first().waitFor();
        await openPjt(page, 'tema');
        for (const name of ['mision', 'pasos', 'orden', 'recursos']) {
          await section(page, name); await noOverflow(page, name);
          await page.locator('#pjtBack').click();
          assert(await page.locator('#pjtRoot').isVisible(), 'Back from a section returns to PJT start');
          assert(await page.locator('#pjtRoot [data-pjt-go="mision"]').first().isVisible());
        }
        await section(page, 'mision');
        for (const field of mission) {
          const input = page.locator(`[data-pjt-field="${field}"]`);
          assert.equal(await input.count(), 1, `${field}: mission field`);
          if (field !== 'm_superior') assert.equal(await input.evaluate(el => el.tagName), 'TEXTAREA');
          await input.fill(field === 'm_quien' ? injection : 'Nota de prueba ' + field);
        }
        await saved(page);
        const firstStored = await page.evaluate(key => localStorage.getItem(key), first.key);
        assert(firstStored && JSON.parse(firstStored), 'Notes saved immediately in the current profile key');
        await page.locator('#pjtReview').click();
        const completeReview = await page.locator('#pjtReviewResult').innerText();
        assert(completeReview.trim(), 'Review reports a result');
        assert(!/faltan|incomplet[oa]|sin completar/i.test(completeReview), 'Complete visible mission fields do not require fields from other sections');
        await page.locator('[data-pjt-field="m_quien"]').fill('');
        await page.locator('#pjtReview').click();
        const incompleteReview = await page.locator('#pjtReviewResult').innerText();
        assert.notEqual(incompleteReview, completeReview, 'Review detects a newly empty mission field');
        assert.match(incompleteReview, /qui[eé]n|falta|complet/i);
        await page.locator('[data-pjt-field="m_quien"]').fill(injection); await saved(page);
        await section(page, 'pasos'); await section(page, 'mision');
        assert.equal(await page.locator('[data-pjt-field="m_quien"]').inputValue(), injection);
        assert.equal(await page.evaluate(() => window.__pjtXss), undefined);
        assert.equal(await page.locator('#pjtRoot img[src="x"],#pjtRoot svg[onload]').count(), 0);
        await darkContrast(page); await noOverflow(page, 'dark mission');
        await page.screenshot({ path: path.join(output, `pjt-${entry.label}-mobile-dark.png`), fullPage: true });
        pass(`${entry.label}: entry points, section/back navigation, scoped review, immediate notes, literal HTML and dark mobile contrast`);

        // Fail only this profile's note writes, preserving login and other application storage.
        const beforeFailure = await page.evaluate(key => localStorage.getItem(key), first.key);
        await page.evaluate(key => {
          window.__pjtOriginalSetItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function (name, value) {
            if (name === key) throw new DOMException('PJT test quota', 'QuotaExceededError');
            return window.__pjtOriginalSetItem.call(this, name, value);
          };
        }, first.key);
        try {
          await page.locator('[data-pjt-field="m_que"]').fill('Esta nota no se pudo guardar');
          await page.waitForFunction(() => /error|no se pudo|no.*guard|fall[oó]/i.test(document.querySelector('#pjtSaveStatus')?.textContent || ''));
          assert.equal(await page.evaluate(key => localStorage.getItem(key), first.key), beforeFailure);
          await page.screenshot({ path: path.join(output, `pjt-${entry.label}-save-error.png`), fullPage: true });
        } finally { await page.evaluate(() => { Storage.prototype.setItem = window.__pjtOriginalSetItem; delete window.__pjtOriginalSetItem; }); }
        await page.locator('[data-pjt-field="m_que"]').fill('Nota de prueba m_que'); await saved(page);
        pass(`${entry.label}: storage write failure is visible and preserves the previous saved notes`);

        await page.evaluate(() => pintarLogin());
        const second = await createProfile(page, `PJT ${entry.label} dos`, '5678');
        assert.notEqual(first.key, second.key);
        await openPjt(page); await section(page, 'mision');
        assert.equal(await page.locator('[data-pjt-field="m_quien"]').inputValue(), '', 'New profile cannot see first profile notes');
        await page.locator('[data-pjt-field="m_quien"]').fill('Nota privada del segundo perfil'); await saved(page);
        await page.evaluate(() => pintarLogin()); await login(page, first.uid, '1234');
        await openPjt(page); await section(page, 'mision');
        assert.equal(await page.locator('[data-pjt-field="m_quien"]').inputValue(), injection);
        const secondStored = await page.evaluate(key => localStorage.getItem(key), second.key);
        assert(secondStored.includes('Nota privada del segundo perfil'));
        pass(`${entry.label}: two real PIN profiles keep independent PJT notes`);

        await context.setOffline(true);
        await page.reload(); await login(page, first.uid, '1234');
        await openPjt(page, 'tema'); await section(page, 'mision');
        assert.equal(await page.locator('[data-pjt-field="m_quien"]').inputValue(), injection);
        await page.locator('[data-pjt-field="m_fin"]').fill('Actualizado sin conexión'); await saved(page);
        await section(page, 'orden'); await section(page, 'mision');
        assert.equal(await page.locator('[data-pjt-field="m_fin"]').inputValue(), 'Actualizado sin conexión');
        await page.reload(); await login(page, first.uid, '1234');
        await openPjt(page); await section(page, 'mision');
        assert.equal(await page.locator('[data-pjt-field="m_fin"]').inputValue(), 'Actualizado sin conexión');
        assert.equal(await page.evaluate(() => window.__pjtXss), undefined);
        await section(page, 'recursos');
        const zoom = page.locator('#pjtRoot [data-pjt-zoom]');
        assert.equal(await zoom.count(), entry.images.length);
        for (let index = 0; index < await zoom.count(); index++) {
          await zoom.nth(index).click();
          const dialog = page.locator('#pjtImageDialog'); await dialog.waitFor();
          assert.equal(await dialog.evaluate(el => el.open), true);
          assert(await dialog.locator('img').evaluate(async el => { await el.decode(); return el.naturalWidth > 0 && !!el.alt.trim(); }));
          if (index === 0) {
            await page.screenshot({ path: path.join(output, `pjt-${entry.label}-gallery.png`), fullPage: true });
            await page.keyboard.press('Escape');
          } else await page.locator('#pjtImageClose').click();
          await dialog.waitFor({ state: 'hidden' });
          assert(await zoom.nth(index).evaluate(el => el === document.activeElement), 'Closing the image restores keyboard focus');
        }
        await noOverflow(page, 'offline resources');
        await offlineResources(page, entry, context, base);
        await page.screenshot({ path: path.join(output, `pjt-${entry.label}-offline.png`), fullPage: true });
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.screenshot({ path: path.join(output, `pjt-${entry.label}-desktop.png`), fullPage: true });
        assert.deepEqual(errors, [], 'No browser JavaScript errors');
        assert.deepEqual(external, [], 'No external requests');
        pass(`${entry.label}: offline reload/edit persistence, all five accessible images and no browser errors`);
      } catch (error) {
        await page.screenshot({ path: path.join(output, `pjt-${entry.label}-failure.png`), fullPage: true }).catch(() => {});
        throw error;
      } finally { await context.close(); }
    }
    fs.writeFileSync(path.join(output, 'pjt-results.json'), JSON.stringify({ passed: report }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  holdCache = false; releaseCache(); server.close();
});
