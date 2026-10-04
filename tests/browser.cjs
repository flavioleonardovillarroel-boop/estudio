const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert/strict');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('C:/Users/leo_v/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const { chromium } = playwright;
const DEPLOY = path.resolve(__dirname,'..');
const RESULTS = process.env.ESTUDIO_TEST_OUTPUT || path.join(DEPLOY,'test-results');
fs.mkdirSync(RESULTS,{recursive:true});
const OLD_SW = path.join(__dirname,'fixtures','sw-v11.js');
const report = [];
let swVersion = 'old', failNavigation = false;
const server = http.createServer((req,res) => {
  const url = new URL(req.url,'http://localhost');
  const sourceMode = url.pathname.startsWith('/source/');
  const prefix = sourceMode ? '/source/' : '/estudio/';
  let file = url.pathname === prefix ? (sourceMode ? 'estudio.html' : 'index.html') : url.pathname.slice(prefix.length);
  if (!url.pathname.startsWith(prefix) || !(sourceMode ? ['estudio.html','sw.js','manifest.webmanifest','icon.svg'] : ['index.html','sw.js','manifest.webmanifest','icon.svg']).includes(file)) { res.writeHead(404); res.end(); return; }
  if (failNavigation && file === 'index.html') {res.writeHead(503);res.end('Unavailable');return;}
  const types = {'estudio.html':'text/html; charset=utf-8','index.html':'text/html; charset=utf-8','sw.js':'application/javascript; charset=utf-8','manifest.webmanifest':'application/manifest+json','icon.svg':'image/svg+xml'};
  res.writeHead(200, {'Content-Type':types[file],'Cache-Control':'no-store'});
  res.end(fs.readFileSync(sourceMode ? (file === 'estudio.html' ? path.join(DEPLOY,'index.html') : path.join(DEPLOY,'source-entry',file)) : file === 'sw.js' && swVersion === 'old' ? OLD_SW : path.join(DEPLOY,file)));
});
function pass(message){ report.push(message); console.log('PASS: '+message); }
(async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:'+server.address().port;
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    const external = [], errors = [];
    await context.route('**/*',route=>{
      if (!route.request().url().startsWith(origin+'/')) { external.push(new URL(route.request().url()).hostname); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/estudio/');
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>navigator.serviceWorker.controller);
    await page.evaluate(()=>caches.open('otra-app-preservar'));
    swVersion = 'new';
    await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
    await page.waitForFunction(async()=>{
      const keys=await caches.keys();return keys.includes('estudio-v17')&&!keys.includes('estudio-v11');
    });
    assert((await page.evaluate(()=>caches.keys())).includes('otra-app-preservar'));
    pass('Real service-worker update v11→v17 removes only Estudio caches');
    const name = 'Prueba & <perfil> " \' local';
    await page.locator('#nuevoNom').fill(name);
    await page.locator('#nuevoPin').fill('1234');
    await page.getByRole('button',{name:'Crear y entrar',exact:true}).click();
    await page.waitForSelector('.materia');
    assert((await page.locator('.hero h2').textContent()).includes(name));
    pass('Profiles, PIN login and literal special characters');
    const card=page.locator('.materia').filter({hasText:'LRE ·'}).first();
    await card.focus(); await page.keyboard.press('Enter');
    await page.waitForSelector('.tema');
    const unit=page.locator('.tema').filter({hasText:'Contexto'}).first();
    await unit.focus(); await page.keyboard.press('Space');
    await page.waitForSelector('#bodyVista');
    assert(await page.locator('.picForm img').count()>0);
    const images=await page.locator('.picForm img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>{i.loading='eager';return i.decode();}));return imgs.every(i=>i.complete&&i.naturalWidth>0);});
    assert(images);
    await page.getByRole('button',{name:'Conceptos',exact:true}).click();
    const concept=page.locator('#cBody .card[role=button]').first();
    await concept.focus();await page.keyboard.press('Enter');
    assert.equal(await concept.locator('.inner2>div:last-child').isVisible(),true);
    await page.getByRole('button',{name:'Cronología',exact:true}).click();
    const date=page.locator('#tlWrap .tl div[role=button]').first();
    await date.focus();await page.keyboard.press('Space');
    assert((await date.getAttribute('class')||'').includes('abierta'));
    pass('Keyboard opens LRE matter/unit, concept cards and chronology; images decode');
    await page.getByRole('button',{name:'Examen',exact:true}).click();
    const quizButtons=await page.locator('#bodyVista button').allTextContents();
    console.log('Quiz choices:',JSON.stringify(quizButtons));
    await page.locator('#bodyVista button').filter({hasText:/5 preguntas|Corta|corta/}).first().click();
    for(let i=0;i<5;i++){
      if(await page.locator('#qBlank').count()){
        await page.locator('#qBlank').fill('respuesta');await page.locator('#qOkReal').click();
      }else if(await page.locator('#qRevelar').count()){
        await page.locator('#qRevelar').click();await page.locator('#qGNo').click();
      }else{await page.locator('.qbtn').first().click();}
      await page.locator('#qNext').click();
    }
    assert(await page.locator('.medal').count());
    pass('Real five-question LRE quiz completes and persists result');
    await page.locator('#btnCal').click();
    await page.getByRole('button',{name:'＋ Agregar fecha',exact:true}).click();
    const title = '" autofocus onfocus="window.__xss=1" & <evento>';
    await page.locator('#evTit').fill(title);
    await page.locator('#evFecha').fill('2026-12-31');
    await page.locator('#evNota').fill('Nota & <literal>');
    await page.getByRole('button',{name:'Guardar fecha',exact:true}).click();
    await page.getByRole('button',{name:'Editar evento',exact:true}).click();
    assert.equal(await page.locator('#evTit').inputValue(),title);
    assert.equal(await page.locator('#evTit').getAttribute('onfocus'),null);
    assert.equal(await page.evaluate(()=>window.__xss),undefined);
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    await page.getByRole('button',{name:'Inicio',exact:true}).click();
    await page.evaluate(()=>{almEstado(2026,12);renderAlmanaque();});
    assert((await page.locator('.alm .cab b').textContent()).includes('Enero 2027'));
    await page.evaluate(()=>{almEstado(2026,11);renderAlmanaque();});
    assert.equal(await page.locator('.alm .ev').getAttribute('title'),title);
    assert.equal(await page.locator('.alm .ev').getAttribute('onfocus'),null);
    pass('Stored event title cannot inject attributes; calendar crosses year correctly');
    await page.locator('#ayIn').waitFor({state:'hidden'});
    assert.equal(await page.locator('#ayIn').isVisible(),false,'closed help input must be hidden');
    await page.locator('#ayFab').click();await page.locator('#ayIn').fill('¿Qué son las medallas?');
    await page.keyboard.press('Enter');
    assert((await page.locator('#ayMsg').textContent()).includes('Oro'));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#ayFab').getAttribute('aria-expanded'),'false');
    await page.locator('#ayIn').waitFor({state:'hidden'});
    assert.equal(await page.locator('#ayIn').isVisible(),false,'Escape must hide help input');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'ayFab');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('#ayFab').evaluate(el=>getComputedStyle(el).animationName),'none');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(RESULTS,'mobile.png'),fullPage:true});
    await page.setViewportSize({width:1280,height:900});
    await page.screenshot({path:path.join(RESULTS,'desktop.png'),fullPage:true});
    pass('Tuti names, hidden controls, Escape/focus return, reduced motion and mobile width');
    await page.goto(origin+'/estudio/icon.svg');
    await context.setOffline(true);
    await page.goto(origin+'/estudio/');
    assert(await page.locator('#selUsuario').count());
    await context.setOffline(false);
    pass('Direct icon navigation cannot overwrite the cached application');
    failNavigation=true;
    await page.goto(origin+'/estudio/');
    assert(await page.locator('#selUsuario').count());
    failNavigation=false;
    pass('HTTP 503 navigation recovers cached application');
    await context.setOffline(true);
    await page.goto(origin+'/estudio/');
    await page.locator('#selPin').fill('1234');await page.getByRole('button',{name:'Entrar 🍀',exact:true}).click();
    assert((await page.locator('.hero h2').textContent()).includes(name));
    await page.evaluate(()=>abrirTema('lre_preventivo'));
    assert(await page.locator('.picForm img').count()>0);
    assert(await page.locator('.picForm img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>{i.loading='eager';return i.decode();}));return imgs.every(i=>i.complete&&i.naturalWidth>0);}));
    await page.reload();
    assert(await page.locator('#selUsuario').count());
    pass('Offline reload, persisted profile/results/calendar and LRE images');
    await page.evaluate(()=>{
      const users=localStorage.getItem('est_usuarios');
      localStorage.setItem('est_usuarios','{}');pintarLogin();
      localStorage.setItem('est_usuarios',users);
      const key=KEYEV(), events=localStorage.getItem(key);
      localStorage.setItem(key,'{}');home();
      localStorage.setItem(key,JSON.stringify([{id:"bad' onclick='x",titulo:'test',fecha:'2026-12-31'}]));
      if(evList().length!==0)throw new Error('Unsafe ID accepted');
      localStorage.setItem(key,events);home();
    });
    pass('Malformed storage and injected IDs do not crash or enter inline handlers');
    await page.evaluate(async()=>{
      if(!Array.isArray(LS.get(KEYEV(),[]))||LS.get(KEYEV(),[]).length!==1)throw new Error('Event persistence lost');
      if(LS.get(KEYQ('lre_contexto'),null)===null)throw new Error('Quiz persistence lost');
      await caches.delete('estudio-v17');
    });
    const unavailable=await page.goto(origin+'/estudio/');
    assert.equal(unavailable.status(),503);
    assert((await page.locator('body').textContent()).includes('No hay conexión'));
    pass('Missing offline cache yields an explicit 503 response instead of a broken promise');
    assert.equal(external.length,0);assert.deepEqual(errors,[]);
    pass('No external requests, Telegram sends or browser JavaScript errors');
    await context.setOffline(false);
    await page.goto(origin+'/source/estudio.html');
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>navigator.serviceWorker.controller&&navigator.serviceWorker.controller.scriptURL.includes('/source/'));
    await context.setOffline(true);
    await page.reload();
    assert(await page.locator('#selUsuario').count());
    assert((await page.evaluate(()=>caches.keys())).includes('estudio-source-v17'));
    pass('Original estudio.html entry point also installs and reloads offline through HTTP');
    fs.writeFileSync(path.join(RESULTS,'browser-results.json'),JSON.stringify({passed:report,errors,external},null,2));
    await context.close();
  } finally { await browser.close(); }
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>server.close());
