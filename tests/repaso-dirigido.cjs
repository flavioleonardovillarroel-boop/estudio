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
const general = topic.preguntas.slice(0, 10);
const ethics = topic.preguntas.slice(10);
assert.equal(general.map(q => q.tipo).join(','), 'mc,mc,vf,mc,mc,mc,vf,unir,mc,mc');
assert.equal(general[7].pares.map(p => p[1]).join(','), 'Leve,Grave,Gravísima');
assert(general[9].o[general[9].c].includes('Profesionalismo militar, espíritu de cuerpo y patriotismo'));
assert.equal(ethics.map(q => q.tipo).join(','), 'mc,vf,vf,mc,unir,mc,vf,mc,mc,mc');
assert.equal(ethics[4].pares.map(p => p[1]).join(','), 'Principio,Procedimiento,Procedimiento,Principio,Procedimiento,Principio');
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

async function answerQuestion(page, q, miss = false) {
  assert.equal(await page.locator('#bodyVista h2').innerText(), q.p);
  if (q.tipo === 'unir') {
    const selects = page.locator('select.qUnir');
    const check = page.getByRole('button', { name: 'Comprobar pares', exact: true });
    assert.equal(await selects.count(), q.pares.length);
    assert(await check.isDisabled());
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (const [i, [, label]] of q.pares.entries()) {
      await selects.nth(i).selectOption({ label: miss && i === 0 ? q.pares[1][1] : label });
    }
    await check.click();
    assert(await selects.first().isDisabled());
    if (miss) assert((await page.locator('#qCorrec').innerText()).includes(q.pares[0][1]));
  } else if (q.tipo === 'vf') {
    assert.equal(await page.locator('.qbtn').count(), 2);
    await page.getByRole('button', { name: q.v ? 'Verdadero' : 'Falso', exact: true }).click();
  } else {
    assert.equal(await page.locator('.qbtn').count(), 4);
    await page.locator('.qbtn').filter({ hasText: q.o[q.c] }).click();
  }
  assert.match(await page.locator('#qFdb').innerText(), miss ? /Incorrecto/ : /Correcto/);
  await page.locator('#qNext').click();
}

async function answerBlock(page, key, questions, missMatch = false) {
  await page.locator('[data-cant="' + key + '"]').click();
  for (const q of questions) {
    await answerQuestion(page, q, missMatch && q.tipo === 'unir');
  }
  const score = await page.locator('#bodyVista').innerText();
  assert(score.includes(missMatch ? '90%' : '100%'));
  assert(score.includes(key === 'general' ? 'V/F: 2/2' : 'V/F: 3/3'));
  assert(score.includes(missMatch ? 'Unir: 0/1' : 'Unir: 1/1'));
  assert(!score.includes('Completar:'));
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
    assert((await page.locator('#bodyVista').innerText()).includes('verdadero/falso y un ejercicio para relacionar'));
    await answerBlock(page, 'general', general, true);
    await page.getByRole('button', { name: 'Repetir examen', exact: true }).click();
    await answerBlock(page, 'mando', ethics, true);
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
    await answerBlock(page, 'mando', ethics);
    assert.deepEqual(errors, []);
    console.log('PASS: ambas materias en el orden del temario, V/F, desplegables y práctica sin conexión');
  } finally {
    await browser.close();
  }
}

run().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
