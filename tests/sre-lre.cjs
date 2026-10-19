const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const http = require('http');
const { chromium } = require('C:/Users/leo_v/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const server = http.createServer((req, res) => {
    const file = req.url === '/' ? 'index.html' : req.url.split('?')[0].slice(1);
    if (!['index.html', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'materiales/logistica-repaso-final.docx'].includes(file)) {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/json');
    res.end(fs.readFileSync(path.join(root, file)));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#nuevoNom').fill('Prueba SRE LRE');
    await page.locator('#nuevoPin').fill('1234');
    await page.getByRole('button', { name: 'Crear y entrar', exact: true }).click();
    assert.equal(await page.evaluate(() => CONTENIDO.materias[0].id), 'm_sre_lre');
    await page.evaluate(() => { barajar = (items) => items.slice(); abrirMateria('m_sre_lre'); });
    assert((await page.locator('body').innerText()).includes('SRE y LRE'));
    await page.evaluate(() => abrirTema('sre_lre_2408'));
    assert((await page.locator('body').innerText()).includes('SRE 2408-14'));
    assert((await page.locator('body').innerText()).includes('SRE 2408-3'));
    assert((await page.locator('body').innerText()).includes('símbolos de estado'));
    assert((await page.locator('body').innerText()).includes('SRE 2408-1 · Registro de Mantenimiento Preventivo'));
    assert((await page.locator('body').innerText()).includes('Cambio del símbolo de estado en el SRE 2408-1'));
    assert((await page.locator('body').innerText()).includes('Registro de Desperfectos no corregidos'));
    assert((await page.locator('body').innerText()).includes('2408-5 es el Registro de Modificación'));
    assert((await page.locator('body').innerText()).includes('Discrepancia del material'));
    assert((await page.locator('body').innerText()).includes('150.000'));
    assert.equal(await page.locator('#secs .sec-blk').count(), 18);
    assert.equal(await page.locator('#bodyVista img').count(), 3);
    await page.locator('#bodyVista img').first().tap();
    assert.equal(await page.locator('dialog[open]').count(), 1);
    await page.getByRole('button', { name: 'Cerrar imagen' }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.evaluate(() => vista('sre_lre_2408', 'conceptos'));
    assert.equal(await page.locator('#cBody .inner2').count(), 33);
    await page.evaluate(() => vista('sre_lre_2408', 'crono'));
    assert.equal(await page.locator('#tlWrap .tl > div').count(), 7);
    assert((await page.locator('#tlWrap').innerText()).includes('Paso 1 · Detectar'));
    const answers = await page.evaluate(() => {
      abrirTema('sre_lre_2408', 'quiz');
      return getTema('sre_lre_2408').preguntas.map((question) => question.o[question.c]);
    });
    assert.equal(answers.length, 40);
    await page.locator('[data-cant="todas"]').click();
    for (const answer of answers) {
      assert.equal(await page.locator('.qbtn').count(), 4);
      await page.locator('.qbtn').filter({ hasText: answer }).click();
      assert.match(await page.locator('#qFdb').innerText(), /correct|bien/i);
      await page.locator('#qNext').click();
    }
    assert.match(await page.locator('body').innerText(), /100/);
    await page.evaluate(() => examenMateria('m_sre_lre'));
    assert((await page.locator('body').innerText()).includes('40 preguntas'));
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await page.locator('#selPin').fill('1234');
    await page.getByRole('button', { name: 'Entrar 🍀', exact: true }).click();
    await page.evaluate(() => abrirMateria('m_sre_lre'));
    await page.evaluate(() => abrirTema('sre_lre_2408'));
    assert.equal(await page.locator('#secs .sec-blk').count(), 18);
    assert.deepEqual(errors, []);
    console.log('PASS: SRE y LRE first in subject order, 18 study sections, 33 cards, 40 MC questions, touch image zoom, 3 embedded images, mobile and offline');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
