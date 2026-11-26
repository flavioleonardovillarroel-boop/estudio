const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('playwright');
const { pwaResources, waitForWorker } = require('./helpers/pwa-resources.cjs');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const start = html.indexOf('var CONTENIDO = {');
const box = {};
vm.runInNewContext(html.slice(start, html.indexOf('\n};', start) + 3), box);
const { materias, temas } = box.CONTENIDO;
const id = 'finales_repaso_temario_20261125';
const topic = temas.find(t => t.id === id);
assert.equal(materias.find(m => m.id === 'm_finales').unidades[0], id);
assert.equal(topic.preguntas.length, 20);
for (const questions of [topic.preguntas.slice(0, 10), topic.preguntas.slice(10)]) {
  assert.equal(questions.filter(q => q.tipo === 'completar').length, 3);
  assert.equal(questions.filter(q => q.tipo === 'mc').length, 7);
  for (const q of questions.filter(q => q.tipo === 'completar')) {
    assert.equal(q.p.match(/____/g).length, 1);
    assert.equal(q.alternativas.length, 3);
  }
}
const approvedTheory = temas.find(t => t.id === 'finales_teoria_general_6_temas_2026');
const approvedEthics = temas.find(t => t.id === 'finales_etica_mando_2026');
const definitions = approvedTheory.secciones.find(s => s.titulo.includes('Tipos de sanción')).parrafos
  .filter(p => /^<strong>(Leves|Graves|Gravísimas)\.<\/strong>/.test(p))
  .map(p => p.split('</strong> ')[1]);
assert.equal(definitions.length, 3);
const theoryReading = topic.secciones.find(s => s.titulo === 'Teoría General').parrafos.join(' ');
for (const definition of definitions) assert(theoryReading.includes(definition));
for (const expected of ['resistir y rechazar agresiones', 'Dura <strong>una semana', 'oportunidad fijada por el <strong>PON', 'un oficial de semana por elemento', 'un auxiliar de semana por subunidad']) {
  assert(theoryReading.includes(expected));
}
const ethicsReading = topic.secciones.find(s => s.titulo === 'Ética y Mando').parrafos.join(' ');
const approvedDefinitions = approvedEthics.secciones.find(s => s.titulo.startsWith('Mando comando')).parrafos;
assert(ethicsReading.includes(approvedDefinitions[1]));
assert(ethicsReading.includes(approvedDefinitions[3]));

const material = 'materiales/finales/repaso-rapido-eve.docx';
const resources = pwaResources(root);
assert(resources.cachedFiles.has(material));
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const entry = resources.resolveRequest(url.pathname.slice(1));
  if (!entry) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': resources.mimeFor(entry), 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(resources.pathFor(entry)));
});

async function answerBlock(page, key, questions, missWord) {
  await page.locator('[data-cant="' + key + '"]').click();
  for (const q of questions) {
    const misses = q.tipo === 'completar' && q.o[0] === missWord;
    if (q.tipo === 'completar') {
      const input = page.getByRole('textbox', { name: 'Respuesta para completar' });
      assert.equal(await input.count(), 1);
      assert.equal(await page.locator('.qbtn, .qUnir').count(), 0);
      const solution = q.o[0] === 'gravísima' ? ' GRAVISIMA ' : q.o.at(-1);
      await input.fill(misses ? q.alternativas[0] : solution);
      await input.press('Enter');
      assert(await input.isDisabled());
      if (misses) assert((await page.locator('#qCorrec').innerText()).includes(q.o[0]));
    } else {
      assert.equal(await page.locator('#bodyVista h2').innerText(), q.p);
      assert.equal(await page.locator('.qbtn').count(), 4);
      await page.locator('.qbtn').filter({ hasText: q.o[q.c] }).click();
    }
    assert.match(await page.locator('#qFdb').innerText(), misses ? /Incorrecto/ : /Correcto/);
    await page.locator('#qNext').click();
  }
  const score = await page.locator('#bodyVista').innerText();
  assert(score.includes(missWord ? '90%' : '100%'));
  assert(score.includes(missWord ? 'Completar: 2/3' : 'Completar: 3/3'));
  assert(!score.includes('V/F:') && !score.includes('Unir:'));
}

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/');
    await waitForWorker(page);
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await page.locator('#nuevoNom').fill('Prueba del repaso');
    await page.locator('#nuevoPin').fill('1234');
    await page.getByRole('button', { name: 'Crear y entrar', exact: true }).click();
    const openModule = async () => {
      await page.locator('.materia').filter({ hasText: 'SEMANAS AZULES' }).click();
      await page.locator('.tema').first().click();
      assert.equal(await page.locator('#hdTitle').innerText(), topic.nombre);
    };
    await openModule();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: 'Examen', exact: true }).click();
    assert((await page.locator('#bodyVista').innerText()).includes('Opción múltiple y completar palabras.'));
    await answerBlock(page, 'general', topic.preguntas.slice(0, 10), 'sargento');
    await page.getByRole('button', { name: 'Repetir examen', exact: true }).click();
    await answerBlock(page, 'mando', topic.preguntas.slice(10));
    await page.getByRole('button', { name: '← Volver', exact: true }).click();
    assert.equal(await page.locator('#hdTitle').innerText(), 'SEMANAS AZULES');
    await context.setOffline(true);
    await page.reload();
    await page.locator('#selPin').fill('1234');
    await page.getByRole('button', { name: 'Entrar 🍀', exact: true }).click();
    await openModule();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#secs a[download]').click()]);
    assert.equal(await download.failure(), null);
    assert.deepEqual(fs.readFileSync(await download.path()), fs.readFileSync(resources.pathFor(material)));
    await page.getByRole('button', { name: 'Examen', exact: true }).click();
    await page.locator('[data-cant="general"]').click();
    for (const q of topic.preguntas.slice(0, 2)) {
      await page.locator('.qbtn').filter({ hasText: q.o[q.c] }).click();
      await page.locator('#qNext').click();
    }
    await page.locator('#qBlank').fill('servicio');
    await page.getByRole('button', { name: 'Responder', exact: true }).click();
    assert.match(await page.locator('#qFdb').innerText(), /Correcto/);
    assert.deepEqual(errors, []);
    console.log('PASS: 20 consignas de opción múltiple y completar, correcciones, navegación móvil y estudio sin conexión');
  } finally {
    await browser.close();
  }
}

run().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
