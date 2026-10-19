const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm'),cp=require('child_process'),crypto=require('crypto'),http=require('http');
const {chromium}=require('C:/Users/leo_v/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {pwaResources,waitForWorker}=require('./helpers/pwa-resources.cjs');
const root=path.resolve(__dirname,'..'),fixture=require('./fixtures/logistica-repaso-dirigido.json');
const git='C:/Users/leo_v/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe';
const baseline='b2896a2',html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function getContent(s){let start=s.indexOf('var CONTENIDO = {'),end=s.indexOf('\n};',start),box={};vm.createContext(box);vm.runInContext(s.slice(start,end+3),box);return JSON.parse(JSON.stringify(box.CONTENIDO));}
function outside(s){let start=s.indexOf('var CONTENIDO = {'),end=s.indexOf('\n};',start);return s.slice(0,start)+s.slice(end+3);}
function gitFile(file){return cp.execFileSync(git,['show',baseline+':'+file],{cwd:root,maxBuffer:25e6});}
const oldHtml=gitFile('index.html').toString('utf8'),before=getContent(oldHtml),current=getContent(html);
assert.equal(html,fs.readFileSync(path.join(root,'source-entry/estudio.html'),'utf8'));assert.equal(outside(html),outside(oldHtml));
const topic=current.temas.find(x=>x.id===fixture.module_id),subject=current.materias.find(x=>x.id===fixture.subject_id);
assert.equal(current.temas[0].id,fixture.module_id);assert.equal(current.materias[0].id,fixture.subject_id);assert.equal(subject.unidades[0],fixture.module_id);
assert.deepEqual(current.materias.slice(1).map(m=>m.id),before.materias.filter(m=>m.id!==subject.id).map(m=>m.id));
assert.deepEqual({...subject,unidades:subject.unidades.slice(1)},before.materias.find(m=>m.id===subject.id));
for(const m of current.materias.filter(m=>m.id!==subject.id))assert.deepEqual(m,before.materias.find(x=>x.id===m.id));
const fixed=current.temas.find(t=>t.id===fixture.corrected_module_id),previous=before.temas.find(t=>t.id===fixture.corrected_module_id);
const fixedSummary=fixed.secciones.find(s=>s.titulo==='Repaso final en diez respuestas'),previousSummary=previous.secciones.find(s=>s.titulo==='Repaso final en diez respuestas');
assert.deepEqual(fixedSummary.parrafos.filter((_,i)=>i!==1),previousSummary.parrafos.filter((_,i)=>i!==1));
const fixedTable=fixed.secciones.find(s=>s.titulo==='Cuadro de funciones de material'),previousTable=previous.secciones.find(s=>s.titulo==='Cuadro de funciones de material');
assert.deepEqual(fixedTable.parrafos.slice(0,-1),previousTable.parrafos);assert.match(fixedTable.parrafos.at(-1),/^FUNCIÓN: Control de daños zonal/);
const fixedAnswer=fixed.secciones.find(s=>s.titulo.startsWith('2. Defina')),previousAnswer=previous.secciones.find(s=>s.titulo.startsWith('2. Defina'));
assert.equal(fixedAnswer.parrafos.length,previousAnswer.parrafos.length);assert.equal(fixedAnswer.parrafos[3],previousAnswer.parrafos[3]);
assert.equal(fixed.secciones[0].parrafos[0],fixture.correction_note);
assert.match(fixed.preguntas[1].p,/2004/);assert.match(fixed.preguntas[1].o[fixed.preguntas[1].c],/control de daños zonal/);
assert.match(fixed.conceptos.find(c=>c.t==='Funciones de material').d,/control de daños zonal/);
assert.equal(fixed.preguntas.length,previous.preguntas.length);assert.equal(fixed.conceptos.length,previous.conceptos.length);
assert.equal(fixed.preguntas[1].c,previous.preguntas[1].c);assert.deepEqual(fixed.preguntas[1].o.filter((_,i)=>i!==fixed.preguntas[1].c),previous.preguntas[1].o.filter((_,i)=>i!==previous.preguntas[1].c));
// Restrict the old module correction to its documented functions block and notice.
let restored=structuredClone(fixed);
restored.secciones[0].parrafos.shift();
for(const title of ['2. Defina y describa las funciones de la Logística de Material.','Cuadro de funciones de material','Repaso final en diez respuestas']){
 const i=restored.secciones.findIndex(s=>s.titulo===title);restored.secciones[i]=structuredClone(previous.secciones[i]);
}
for(const field of ['conceptos','cronologia']){
 const key=field==='conceptos'?'t':'fecha';const i=restored[field].findIndex(x=>/Funciones de material/.test(x[key]));restored[field][i]=structuredClone(previous[field][i]);
}
restored.preguntas[1]=structuredClone(previous.preguntas[1]);assert.deepEqual(restored,previous);
assert.deepEqual(current.temas.filter(t=>t.id!==fixture.module_id).map(t=>t.id===fixed.id?previous:t),before.temas);
assert.equal(fixture.function_blocks.length,11);assert.match(fixture.pending,/Logística de Personal/);
assert.deepEqual(fixture.services.map(([name])=>name),['Arsenales','Intendencia','Veterinaria','Transporte','Construcciones']);
const personal=topic.secciones.find(s=>s.titulo==='1.003. Las 11 funciones de Logística de Personal');
assert(personal);assert.equal(personal.parrafos[0],fixture.personal_definition);
fixture.function_blocks.forEach(([name,full],i)=>assert.equal(personal.parrafos[i+1],'<strong>'+String.fromCharCode(97+i)+'. '+name+'.</strong> '+full));
const services=topic.secciones.find(s=>s.titulo.startsWith('2. '));
fixture.services.forEach(([name,full],i)=>assert.equal(services.parrafos[i+1],'<strong>'+String.fromCharCode(97+i)+'. '+name+':</strong> '+full));
assert(!JSON.stringify(topic).includes('11 bloques'));assert(!JSON.stringify(topic).includes('SUCOM'));assert(!JSON.stringify(topic).includes('SZR/SZC'));
assert.equal(topic.preguntas.length,38);assert.equal(topic.conceptos.length,33);assert.equal(topic.cronologia.length,13);
fixture.questions.forEach(([q,a])=>{assert(topic.secciones.some(s=>s.parrafos.includes(a)));assert(topic.conceptos.some(c=>c.t===q&&c.d===a));});
fixture.exam.forEach((q,i)=>{assert.deepEqual(topic.preguntas[i],q);assert.equal(q.tipo,'mc');assert.equal(q.o.length,4);assert.equal(new Set(q.o).size,4);assert(Number.isInteger(q.c)&&q.c>=0&&q.c<4);assert(q.e.trim().length>0);assert.equal(typeof q.o[q.c],'string');});
assert(topic.preguntas.some(q=>/Cuántas funciones de Logística de Personal/.test(q.p)&&q.o[q.c]==='Once.'));
assert.deepEqual(fixture.function_blocks.map(([n])=>n),['Mantenimiento de los efectivos','Reemplazos','Administración de Personal','Disciplina, Ley y Orden','Prisioneros de Guerra','Mantenimiento de la Moral','Necrológica','Administración Interna','Personal Civil','Sanidad','Seguridad contra Accidentes']);
for(const file of ['materiales/logistica-repaso-final.docx','materiales/mecanica-automotriz-16-preguntas.docx','source-entry/materiales/logistica-repaso-final.docx','source-entry/materiales/mecanica-automotriz-16-preguntas.docx'])assert.deepEqual(fs.readFileSync(path.join(root,file)),gitFile(file));
const main=pwaResources(root),source=pwaResources(root,{sourceMode:true});
for(const resources of [main,source])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(resources.pathFor(fixture.download.slice(2)))).digest('hex'),fixture.source_sha256);
console.log('PASS: 11 Personal functions and five service definitions verbatim, 38 MC, unrelated modules/files preserved');
(async()=>{
 const server=http.createServer((req,res)=>{let u=new URL(req.url,'http://localhost'),isSource=u.pathname.startsWith('/source/'),prefix=isSource?'/source/':'/estudio/',resources=isSource?source:main;let file=u.pathname.startsWith(prefix)?resources.resolveRequest(u.pathname.slice(prefix.length)):null;if(file===null){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':resources.mimeFor(file),'Cache-Control':'no-store'});res.end(fs.readFileSync(resources.pathFor(file)));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const origin='http://127.0.0.1:'+server.address().port;
  for(const [isSource,resources] of [[false,main],[true,source]]){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const external=[],errors=[];
   await context.route('**/*',r=>{if(r.request().url().startsWith(origin+'/'))return r.continue();external.push(r.request().url());return r.abort();});
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+(isSource?'/source/estudio.html':'/estudio/'));await waitForWorker(page);await page.waitForFunction(()=>navigator.serviceWorker.controller);
   await page.locator('#nuevoNom').fill('Prueba logística');await page.locator('#nuevoPin').fill('1234');await page.getByRole('button',{name:'Crear y entrar',exact:true}).tap();assert.match(await page.locator('.materia').first().innerText(),/Logística/);
   await page.locator('.materia').filter({has:page.locator('b').filter({hasText:/^Logística$/})}).tap();assert.match(await page.locator('.tema').first().innerText(),/Repaso dirigido/);await page.locator('.tema').first().tap();
   const text=await page.locator('#secs').innerText();for(const [q,a] of fixture.questions)assert(text.includes(a));for(const [n] of fixture.function_blocks)assert(text.includes(n));assert(text.includes(fixture.pending));assert.equal(await page.locator('a[download]').getAttribute('href'),fixture.download);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(!isSource){
    fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await page.screenshot({path:path.join(root,'test-results/logistica-dirigido-mobile.png')});
    await page.getByRole('button',{name:'Conceptos',exact:true}).tap();assert.equal(await page.locator('#cBody .inner2').count(),33);
    await page.getByRole('button',{name:'Cronología',exact:true}).tap();assert.equal(await page.locator('#tlWrap .tl>div').count(),13);
    await page.evaluate(()=>{barajar=items=>items.slice();});await page.getByRole('button',{name:'Examen',exact:true}).tap();await page.locator('[data-cant="todas"]').tap();
    for(const q of topic.preguntas){assert.equal(await page.locator('.qbtn').count(),4);const option=page.locator('.qbtn').nth(q.c);assert.equal((await option.innerText()).replace(/^[A-D]\)\s*/,''),q.o[q.c]);await option.tap();assert.match(await page.locator('#qFdb').innerText(),/correct|bien/i);await page.locator('#qNext').tap();}assert.match(await page.locator('#bodyVista').innerText(),/100%/);
    await page.getByRole('button',{name:'← Volver',exact:true}).tap();await page.locator('.tema').filter({hasText:'Guía de 13 puntos'}).tap();await page.getByRole('button',{name:'← Volver',exact:true}).tap();assert.match(await page.locator('.tema').first().innerText(),/Repaso dirigido/);await page.locator('.tema').first().tap();
    await page.setViewportSize({width:1280,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   }
   const download=await page.evaluate(async href=>{let r=await fetch(href);return {ok:r.ok,bytes:Array.from(new Uint8Array(await r.arrayBuffer()))};},fixture.download);assert(download.ok);assert.equal(crypto.createHash('sha256').update(Buffer.from(download.bytes)).digest('hex'),fixture.source_sha256);
   await context.setOffline(true);await page.reload();await page.locator('#selPin').fill('1234');await page.getByRole('button',{name:'Entrar 🍀',exact:true}).tap();await page.evaluate(({matter,id})=>{abrirMateria(matter);abrirTema(id);},{matter:fixture.subject_id,id:fixture.module_id});
   const offline=await page.locator('#secs').innerText();for(const [q,a] of fixture.questions)assert(offline.includes(a));const cached=await page.evaluate(async href=>{let r=await fetch(href);return {ok:r.ok,size:(await r.arrayBuffer()).byteLength};},fixture.download);assert(cached.ok);assert.equal(cached.size,download.bytes.length);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await context.close();
   console.log('PASS: '+(isSource?'alternative entry':'touch, desktop, 38 quiz answers, return navigation')+', complete reading and PDF download offline');
  }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
