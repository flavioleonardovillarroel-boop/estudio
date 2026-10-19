const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),cp=require('child_process'),http=require('http');
const {chromium}=require('C:/Users/leo_v/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {pwaResources,waitForWorker}=require('./helpers/pwa-resources.cjs');
const root=path.resolve(__dirname,'..'),fixture=require('./fixtures/mecanica-automotriz-16.json');
const git='C:/Users/leo_v/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe';
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function content(s){const a=s.indexOf('var CONTENIDO = {'),b=s.indexOf('\n};',a),box={};vm.createContext(box);vm.runInContext(s.slice(a,b+3),box);return JSON.parse(JSON.stringify(box.CONTENIDO));}
function outside(s){const a=s.indexOf('var CONTENIDO = {'),b=s.indexOf('\n};',a);return s.slice(0,a)+s.slice(b+3);}
const current=content(html),topic=current.temas.find(t=>t.id===fixture.module_id),subject=current.materias.find(m=>m.id===fixture.subject_id);
const baseline=cp.execFileSync(git,['show','1c19922:index.html'],{cwd:root,encoding:'utf8',maxBuffer:25e6}),before=content(baseline),normalized=structuredClone(current);
assert.equal(current.temas[0].id,fixture.module_id);
assert.equal(current.materias[0].id,fixture.subject_id);
assert.equal(subject.unidades[0],fixture.module_id);
assert.equal(subject.nombre,'Mecánica automotriz');
assert.deepEqual(subject.unidades,[fixture.module_id]);
assert.equal(current.materias.filter(m=>m.unidades.includes(fixture.module_id)).length,1);
assert.deepEqual(current.temas,before.temas,'The move must preserve every module and progress ID');
const practice=current.materias.find(m=>m.id==='m_practica_profesionalizante');
assert.deepEqual(practice.unidades,['ppvr_parte1']);
const originalContent=content(cp.execFileSync(git,['show','e127478:index.html'],{cwd:root,encoding:'utf8',maxBuffer:25e6}));
const originalPractice=originalContent.materias.find(m=>m.id===practice.id);
assert.deepEqual(practice,originalPractice,'Professional Practice must match its state before the automotive questionnaire');
assert.deepEqual(current.materias.filter(m=>m.id!==fixture.subject_id).map(m=>m.id),originalContent.materias.map(m=>m.id),'The remaining subjects must retain their original order');
assert.equal(current.materias.length,before.materias.length+1);
normalized.materias=normalized.materias.filter(m=>m.id!==fixture.subject_id);
normalized.materias[normalized.materias.findIndex(m=>m.id===practice.id)]=structuredClone(before.materias.find(m=>m.id===practice.id));
normalized.materias.sort((a,b)=>before.materias.findIndex(m=>m.id===a.id)-before.materias.findIndex(m=>m.id===b.id));
assert.deepEqual(normalized,before,'Existing material and IDs must remain intact');
assert.equal(outside(html).replaceAll('\r\n','\n'),outside(baseline).replaceAll('\r\n','\n'),'App code and embedded images must remain intact');
assert.equal(html,fs.readFileSync(path.join(root,'source-entry/estudio.html'),'utf8'));
assert.equal(topic.preguntas.length,16);assert.equal(topic.conceptos.length,16);assert.equal(topic.cronologia.length,16);
fixture.questions.forEach((q,i)=>{
 assert.equal(topic.secciones[i+1].parrafos[0],q.a);
 assert.equal(topic.conceptos[i].d,q.a);assert.equal(topic.cronologia[i].dato,q.a);
 const exam=topic.preguntas[i];assert.equal(exam.tipo,'mc');assert.equal(exam.o.length,4);assert.equal(new Set(exam.o).size,4);assert.equal(exam.o[exam.c],q.correct);assert.equal(exam.e,q.a);
});
const main=pwaResources(root),source=pwaResources(root,{sourceMode:true}),relative=fixture.download.slice(2);
for(const resources of [main,source]){
 assert(resources.cachedFiles.has(relative));
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(resources.pathFor(relative))).digest('hex'),fixture.source_sha256);
}
console.log('PASS: all 16 answers, MC questions, cards, review entries, identical Word copies and preservation of all previous material');

(async()=>{
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),sourceMode=url.pathname.startsWith('/source/'),prefix=sourceMode?'/source/':'/estudio/',resources=sourceMode?source:main;
  const file=url.pathname.startsWith(prefix)?resources.resolveRequest(url.pathname.slice(prefix.length)):null;
  if(file===null){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':resources.mimeFor(file),'Cache-Control':'no-store'});res.end(fs.readFileSync(resources.pathFor(file)));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const [sourceMode,resources] of [[false,main],[true,source]]){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
   const external=[],errors=[];
   await context.route('**/*',r=>{if(r.request().url().startsWith(origin+'/'))return r.continue();external.push(r.request().url());return r.abort();});
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+(sourceMode?'/source/estudio.html':'/estudio/'));
   await waitForWorker(page);await page.waitForFunction(()=>navigator.serviceWorker.controller);
   await page.locator('#nuevoNom').fill('Prueba mecánica');await page.locator('#nuevoPin').fill('1234');await page.getByRole('button',{name:'Crear y entrar',exact:true}).tap();
   assert.match(await page.locator('.materia').first().innerText(),/Mecánica automotriz/);
   await page.locator('.materia').filter({has:page.locator('b').filter({hasText:/^Mecánica automotriz$/})}).tap();
   assert.match(await page.locator('.tema').first().innerText(),/Mecánica automotriz/);assert.equal(await page.locator('.tema').count(),subject.unidades.length);
   await page.locator('.tema').first().tap();
   assert.equal(await page.locator('#secs .sec-blk').count(),topic.secciones.length);
   const study=await page.locator('#secs').innerText();for(const q of fixture.questions)assert(study.includes(q.a));
   assert.equal(await page.locator('a[download]').getAttribute('href'),fixture.download);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(!sourceMode){
    fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await page.screenshot({path:path.join(root,'test-results/mecanica-mobile.png')});
    await page.getByRole('button',{name:'Conceptos',exact:true}).tap();assert.equal(await page.locator('#cBody .inner2').count(),16);
    await page.getByRole('button',{name:'Cronología',exact:true}).tap();assert.equal(await page.locator('#tlWrap .tl>div').count(),16);await page.getByRole('button',{name:'Revelar todas',exact:true}).tap();assert.equal(await page.locator('#tlWrap .abierta').count(),16);
    await page.evaluate(()=>{barajar=items=>items.slice();});await page.getByRole('button',{name:'Examen',exact:true}).tap();await page.locator('[data-cant="todas"]').tap();
    for(const q of topic.preguntas){assert.equal(await page.locator('.qbtn').count(),4);await page.locator('.qbtn').filter({hasText:q.o[q.c]}).tap();assert.match(await page.locator('#qFdb').innerText(),/correct|bien/i);await page.locator('#qNext').tap();}
    assert.match(await page.locator('#bodyVista').innerText(),/100%/);
    await page.getByRole('button',{name:'← Volver',exact:true}).tap();assert.equal(await page.locator('.tema').count(),1);assert.match(await page.locator('.tema').first().innerText(),/Mecánica automotriz/);
    await page.getByRole('button',{name:'Inicio',exact:true}).tap();await page.locator('.materia').filter({has:page.locator('b').filter({hasText:/^Práctica Profesionalizante$/})}).tap();assert.equal(await page.locator('.tema').count(),1);await page.locator('.tema').filter({hasText:'Parte 1'}).tap();await page.getByRole('button',{name:'← Volver',exact:true}).tap();assert.equal(await page.locator('.tema').count(),1);
    await page.getByRole('button',{name:'Inicio',exact:true}).tap();await page.locator('.materia').filter({has:page.locator('b').filter({hasText:/^Mecánica automotriz$/})}).tap();await page.locator('.tema').first().tap();
    await page.setViewportSize({width:1280,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'test-results/mecanica-desktop.png')});
   }
   const word=await page.evaluate(async href=>{const r=await fetch(href);return {ok:r.ok,bytes:Array.from(new Uint8Array(await r.arrayBuffer()))};},fixture.download);
   assert(word.ok);assert.equal(crypto.createHash('sha256').update(Buffer.from(word.bytes)).digest('hex'),fixture.source_sha256);
   await context.setOffline(true);await page.reload();await page.locator('#selPin').fill('1234');await page.getByRole('button',{name:'Entrar 🍀',exact:true}).tap();
   await page.evaluate(({matter,id})=>{abrirMateria(matter);abrirTema(id);},{matter:fixture.subject_id,id:fixture.module_id});
   const offlineStudy=await page.locator('#secs').innerText();for(const q of fixture.questions)assert(offlineStudy.includes(q.a));
   const offlineWord=await page.evaluate(async href=>{const r=await fetch(href);return {ok:r.ok,size:(await r.arrayBuffer()).byteLength};},fixture.download);assert(offlineWord.ok);assert.equal(offlineWord.size,word.bytes.length);
   assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await context.close();
   console.log('PASS: '+(sourceMode?'alternative entry':'touch, desktop, 16 exam answers, return navigation')+', complete reading and Word download offline');
  }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
