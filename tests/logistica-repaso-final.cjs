const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),cp=require('child_process'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('C:/Users/leo_v/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),id='log_repaso_final_material';
const git='C:/Users/leo_v/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe';
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/logistica-repaso-final.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const baseline=cp.execFileSync(git,['-C',root,'show','5548d42:index.html'],{encoding:'utf8',maxBuffer:20e6});
function readData(html){const start=html.indexOf('var CONTENIDO = {'),end=html.indexOf('\n};',start);const box={};vm.createContext(box);vm.runInContext(html.slice(start,end+3),box);return JSON.parse(JSON.stringify(box.CONTENIDO));}
const original=readData(baseline),actual=readData(html),normalized=structuredClone(actual);
const topic=actual.temas.find(t=>t.id===id),subject=actual.materias.find(m=>m.id==='m_logistica');
assert.equal(actual.temas[0].id,id);
assert.equal(subject.unidades[0],id);
assert.equal(topic.preguntas.length,10);
assert.equal(topic.secciones.length,21);
assert.equal(topic.conceptos.length,27);
assert.equal(topic.cronologia.length,10);
const text=topic.secciones.flatMap(s=>s.parrafos).join('\n');
for(const q of fixture.questions){assert(text.includes(q.developed));assert(text.includes(q.short));assert(text.includes(q.memory));assert(text.includes(q.reference));}
for(const s of fixture.sources)assert(text.includes(s));
for(const row of fixture.quick_answers)assert(text.includes(row[2]));
assert.deepEqual(topic.preguntas.map(q=>q.o[q.c]),fixture.questions.map(q=>q.short));
for(const q of topic.preguntas){assert.equal(q.tipo,'mc');assert.equal(q.o.length,4);assert.equal(new Set(q.o).size,4);}
normalized.temas=normalized.temas.filter(t=>t.id!==id);
normalized.materias.find(m=>m.id==='m_logistica').unidades=subject.unidades.filter(unit=>unit!==id);
assert.deepEqual(normalized,original,'Other subjects, questions, ordering and existing Logistics units must be preserved');
function outsideData(s){const a=s.indexOf('var CONTENIDO = {'),b=s.indexOf('\n};',a);return(s.slice(0,a)+s.slice(b+3)).replaceAll('\r\n','\n');}
assert.equal(outsideData(html),outsideData(baseline),'The app code and embedded images must remain unchanged');
assert.equal(html,fs.readFileSync(path.join(root,'source-entry/estudio.html'),'utf8'));
for(const dir of ['', 'source-entry/']){
 const bytes=fs.readFileSync(path.join(root,dir,'materiales/logistica-repaso-final.docx'));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),fixture.source_sha256);
 const sw=fs.readFileSync(path.join(root,dir,'sw.js'),'utf8');
 assert(sw.includes(dir?'estudio-source-v36':'estudio-v36'));
 assert(sw.includes("'./materiales/logistica-repaso-final.docx'"));
 new vm.Script(sw);
}
new vm.Script([...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)][0][1]);
console.log('PASS: full source answers, comparison tables, original Word, 10 MC questions and all existing content preserved');

(async()=>{
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(!['index.html','sw.js','manifest.webmanifest','icon.svg','materiales/logistica-repaso-final.docx'].includes(name)){res.writeHead(404);return res.end();}
  const type=name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'application/javascript':name.endsWith('.docx')?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(fs.readFileSync(path.join(root,name)));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const origin='http://127.0.0.1:'+server.address().port;
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);
  await page.locator('#nuevoNom').fill('Prueba Repaso Final');
  await page.locator('#nuevoPin').fill('1234');
  await page.getByRole('button',{name:'Crear y entrar',exact:true}).click();
  await page.locator('.materia').filter({has:page.locator('b').filter({hasText:/^Logística$/})}).tap();
  assert.match(await page.locator('.tema').first().innerText(),/Repaso final/);
  assert.equal(await page.locator('.tema').count(),subject.unidades.length);
  await page.locator('.tema').first().tap();
  assert.equal(await page.locator('#secs .sec-blk').count(),21);
  const studyText=await page.locator('#secs').innerText();
  for(const q of fixture.questions)assert(studyText.includes(q.developed));
  assert.equal(await page.locator('a[download]').getAttribute('href'),'./materiales/logistica-repaso-final.docx');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  await page.screenshot({path:path.join(root,'test-results/logistica-repaso-final-mobile.png')});
  await page.getByRole('button',{name:'Conceptos',exact:true}).tap();
  assert.equal(await page.locator('#cBody .inner2').count(),27);
  await page.getByRole('button',{name:'Cronología',exact:true}).tap();
  assert.equal(await page.locator('#tlWrap .tl>div').count(),10);
  await page.getByRole('button',{name:'Revelar todas',exact:true}).tap();
  assert.equal(await page.locator('#tlWrap .abierta').count(),10);
  await page.evaluate(()=>{barajar=items=>items.slice();});
  await page.getByRole('button',{name:'Examen',exact:true}).tap();
  await page.locator('[data-cant="todas"]').tap();
  for(const q of topic.preguntas){
   assert.equal(await page.locator('.qbtn').count(),4);
   await page.locator('.qbtn').filter({hasText:q.o[q.c]}).tap();
   assert.match(await page.locator('#qFdb').innerText(),/correct|bien/i);
   await page.locator('#qNext').tap();
  }
  assert.match(await page.locator('#bodyVista').innerText(),/100%/);
  await page.getByRole('button',{name:'← Volver',exact:true}).tap();
  await page.locator('.tema').filter({hasText:'Contexto'}).first().tap();
  await page.getByRole('button',{name:'← Volver',exact:true}).tap();
  assert.match(await page.locator('.tema').first().innerText(),/Repaso final/);
  await page.evaluate(()=>examenMateria('m_logistica'));
  const total=subject.unidades.reduce((n,unit)=>n+actual.temas.find(t=>t.id===unit).preguntas.length,0);
  assert((await page.locator('#bodyEx').innerText()).includes(total+' preguntas'));
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  const cached=await page.evaluate(async()=>{
   const cache=await caches.open('estudio-v36'),word=await cache.match('./materiales/logistica-repaso-final.docx');
   return word ? (await word.arrayBuffer()).byteLength : 0;
  });
  assert.equal(cached,fs.statSync(path.join(root,'materiales/logistica-repaso-final.docx')).size);
  await context.setOffline(true);await page.reload();
  await page.locator('#selPin').fill('1234');
  await page.getByRole('button',{name:'Entrar 🍀',exact:true}).tap();
  await page.evaluate(()=>{abrirMateria('m_logistica');abrirTema('log_repaso_final_material');});
  assert.equal(await page.locator('#secs .sec-blk').count(),21);
  const word=await page.evaluate(async()=>{const r=await fetch('./materiales/logistica-repaso-final.docx');return {ok:r.ok,bytes:(await r.arrayBuffer()).byteLength};});
  assert(word.ok);assert.equal(word.bytes,cached);
  assert.deepEqual(errors,[]);
  console.log('PASS: touch/mobile, all 10 questions at 100%, back through LRE, subject exam, cached guide and reading offline');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
