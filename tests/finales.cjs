const fs=require('fs'),path=require('path'),vm=require('vm'),http=require('http'),crypto=require('crypto'),assert=require('assert/strict'),{execFileSync}=require('child_process');
let playwright;try{playwright=require('playwright');}catch{playwright=require('C:/Users/leo_v/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}
const {pwaResources,waitForWorker}=require('./helpers/pwa-resources.cjs');
const root=path.resolve(__dirname,'..'),fixture=require('./fixtures/finales.json'),results=path.join(root,'test-results/finales');
fs.mkdirSync(results,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function content(html){const start=html.indexOf('var CONTENIDO = {'),end=html.indexOf('\n};',start)+3,context={};vm.runInNewContext(html.slice(start,end),context);return {data:JSON.parse(JSON.stringify(context.CONTENIDO)),outside:html.slice(0,start)+html.slice(end)};}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.equal(html,fs.readFileSync(path.join(root,'source-entry/estudio.html'),'utf8'));
const git=process.env.ESTUDIO_GIT||'git';
const baseline=content(execFileSync(git,['show',fixture.baseline+':index.html'],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024})),current=content(html);
assert(current.outside.includes('Práctica mixta (recomendada)'),'Finales must offer the mixed-practice pilot');
assert(current.outside.includes('Solo opción múltiple'),'Finales must preserve the previous multiple-choice mode');
const weekIds=current.data.materias.find(m=>m.id===fixture.materia).unidades;
const old=JSON.parse(JSON.stringify(current.data));old.materias=old.materias.filter(m=>m.id!==fixture.materia);old.temas=old.temas.filter(t=>!weekIds.includes(t.id));
assert.deepEqual(old,baseline.data,'All existing subjects/modules/progress IDs must be preserved exactly');
assert.equal(current.data.materias[0].id,fixture.materia);
assert.equal(current.data.materias[0].nombre,'SEMANAS AZULES');
const inherited = weekIds.filter(id=>id!=='finales_repaso_temario_20261125');
assert.deepEqual(inherited.slice(0,3),['semana_azul_vc_tam_2026','semana_azul_sk105_2026','semana_azul_m113_2026']);
assert.deepEqual(inherited.slice(3,5),fixture.topics.map(t=>t.id));
assert.equal(inherited[5],'semana_azul_mecanica_automotriz_2026');
const configurations=[pwaResources(root),pwaResources(root,{sourceMode:true})];
const totalQuestions=weekIds.reduce((sum,id)=>sum+current.data.temas.find(t=>t.id===id).preguntas.length,0);
for(const f of fixture.topics){
 const topic=current.data.temas.find(t=>t.id===f.id);assert(topic);assert.deepEqual(topic.secciones.slice(1).map(s=>s.titulo),f.headings);assert.deepEqual(topic.preguntas,f.questions);
 for(const q of topic.preguntas){assert.equal(q.tipo,'mc');assert.equal(q.o.length,4);assert.equal(new Set(q.o).size,4);assert(Number.isInteger(q.c)&&q.c>=0&&q.c<4);assert(q.e);}
 for(const resources of configurations){assert(resources.cachedFiles.has(f.download));assert.equal(hash(fs.readFileSync(resources.pathFor(f.download))),f.sha256);}
}
console.log('PASS: Exact approved topics/Word/questions, all previous content and app code preserved, both HTML/offline mirrors');
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),source=url.pathname.startsWith('/source/'),prefix=source?'/source/':'/estudio/',resources=configurations[source?1:0],file=resources.resolveRequest(url.pathname.slice(prefix.length));if(!url.pathname.startsWith(prefix)||file===null){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':resources.mimeFor(file),'Cache-Control':'no-store'});res.end(fs.readFileSync(resources.pathFor(file)));});
const passed=[];
async function download(page,f,label){
 const [d]=await Promise.all([page.waitForEvent('download'),page.locator('#secs a[download]').click()]);
 const saved=path.join(results,label+'-'+path.basename(f.download));await d.saveAs(saved);assert.equal(await d.failure(),null);assert.equal(hash(fs.readFileSync(saved)),f.sha256);
}
async function completeExam(page,questions){
 const pure=page.locator('input[name="qFormato"][value="mc"]');if(await pure.count())await pure.check();
 await page.locator('#qOpts [data-cant="todas"]').first().click();
 for(const q of questions){assert.equal(await page.locator('.qbtn').count(),4);const option=page.locator('.qbtn').nth(q.c);assert((await option.textContent()).endsWith(q.o[q.c]));await option.click();assert.match(await page.locator('#qFdb').textContent(),/Correcto/);assert((await page.locator('#qExpl').textContent()).includes(q.e));await page.locator('#qNext').click();}
 assert.equal(await page.locator('.medal').count(),1);assert((await page.locator('#bodyVista').textContent()).includes('100%'));
}
function truthFor(question){let value=0;for(const c of question.p.toLowerCase()){value=((value<<5)-value)+c.charCodeAt(0);value|=0;}return (value>>>0)%2===0;}
async function completeMixedPilot(page,questions){
 const mixed=page.locator('input[name="qFormato"][value="mixto"]');assert.equal(await mixed.isChecked(),true);
 await page.screenshot({path:path.join(results,'finales-mixed-setup-mobile.png'),fullPage:true});
 await page.locator('#qOpts [data-cant="media"]').click();
 for(let i=0;i<10;i++){
  if((i+1)%5===0){
   assert.equal(await page.locator('.qbtn').count(),2);assert((await page.locator('#bodyVista').textContent()).includes('Verdadero / Falso'));
   if(i===4)await page.screenshot({path:path.join(results,'finales-mixed-vf-mobile.png'),fullPage:true});
   const expected=truthFor(questions[i]);const answer=i===9?!expected:expected;await page.getByRole('button',{name:answer?'Verdadero':'Falso',exact:true}).click();
   assert.match(await page.locator('#qFdb').textContent(),i===9?/Incorrecto/:/Correcto/);
  }else{
   assert.equal(await page.locator('.qbtn').count(),4);await page.locator('.qbtn').nth(questions[i].c).click();assert.match(await page.locator('#qFdb').textContent(),/Correcto/);
  }
  await page.locator('#qNext').click();
 }
 const result=await page.locator('#bodyVista').textContent();assert(result.includes('90%'));assert(result.includes('V/F: 1/2'));assert(result.includes('Estado: dominado'));assert(result.includes('Respuesta propuesta:'));assert(result.includes('Correcta: Falso'));
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await playwright.chromium.launch({headless:true,channel:'msedge'});
 try{for(let mode=0;mode<2;mode++){
  const resources=configurations[mode],entry=mode?'/source/estudio.html':'/estudio/',context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),errors=[],external=[];
  await context.route('**/*',route=>{if(!route.request().url().startsWith(origin+'/')){external.push(route.request().url());return route.abort();}return route.continue();});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+entry);await waitForWorker(page);await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await page.locator('#nuevoNom').fill('Finales prueba '+mode);await page.locator('#nuevoPin').fill('1234');await page.getByRole('button',{name:'Crear y entrar',exact:true}).click();
  assert((await page.locator('.materia').first().textContent()).includes('SEMANAS AZULES'));
  const preserved=await page.evaluate(()=>{const k=KEYQ('log_villar');LS.set(k,77);return {key:k,value:localStorage.getItem(k)};});
  await page.locator('.materia').filter({hasText:'SEMANAS AZULES'}).click();assert.equal(await page.locator('.tema').count(),weekIds.length);assert((await page.locator('#view').textContent()).includes(totalQuestions+' preguntas'));
  for(const f of fixture.topics){
   await page.locator('.tema').filter({hasText:f.nombre}).click();
   assert.deepEqual(await page.locator('#secs .sec-blk h3').allTextContents(),['Apunte del final',...f.headings]);
   const text=(await page.locator('#secs').textContent()).replace(/\s+/g,' ');for(const expected of f.expected)assert(text.includes(expected.replace(/\s+/g,' ')),'Missing approved text: '+expected);
   assert.equal(await page.locator('#secs a[download]').getAttribute('href'),'./'+f.download);await download(page,f,'online-'+mode);
   await page.screenshot({path:path.join(results,'reading-'+mode+'-'+f.id+'.png'),fullPage:true});
   const overflow=await page.evaluate(()=>Array.from(document.querySelectorAll('#view *')).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,100),right:e.getBoundingClientRect().right})).slice(0,8));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Reading fits mobile width: '+JSON.stringify(overflow));
   await page.getByRole('button',{name:'Conceptos',exact:true}).click();const card=page.locator('#cBody .card[role=button]').first();await card.click();assert(await card.locator('.inner2>div:last-child').isVisible());
   await page.getByRole('button',{name:'Cronología',exact:true}).click();const item=page.locator('#tlWrap .tl div[role=button]').first();await item.click();assert((await item.getAttribute('class')).includes('abierta'));
   await page.evaluate(()=>{barajar=x=>x.slice();});await page.getByRole('button',{name:'Examen',exact:true}).click();await completeExam(page,f.questions);
   if(mode===0&&f===fixture.topics[0]){await page.getByRole('button',{name:'Repetir examen',exact:true}).click();await completeMixedPilot(page,f.questions);}
   await page.getByRole('button',{name:'← Volver',exact:true}).click();assert.equal(await page.locator('.tema').count(),weekIds.length);assert.equal(await page.locator('#hdTitle').textContent(),'SEMANAS AZULES');
  }
  await page.getByRole('button',{name:'📝 Examen de la materia ('+totalQuestions+' preguntas)',exact:true}).click();assert((await page.locator('#bodyEx').textContent()).includes(totalQuestions+' preguntas'));await page.getByRole('button',{name:'← Materia',exact:true}).click();
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),preserved.key),preserved.value);
  await context.setOffline(true);await page.reload();await page.locator('#selPin').fill('1234');await page.getByRole('button',{name:'Entrar 🍀',exact:true}).click();
  await page.locator('.materia').filter({hasText:'SEMANAS AZULES'}).click();
  for(const f of fixture.topics){
   await page.locator('.tema').filter({hasText:f.nombre}).click();assert((await page.locator('#secs').textContent()).includes(f.expected[1]));await download(page,f,'offline-'+mode);
   await page.getByRole('button',{name:'Examen',exact:true}).click();await page.locator('[data-cant="corta"]').click();await page.locator('.qbtn').first().click();assert(await page.locator('#qNext').isVisible());
   await page.getByRole('button',{name:'← Volver',exact:true}).click();assert.equal(await page.locator('.tema').count(),weekIds.length);
  }
  const cached=await page.evaluate(async name=>(await(await caches.open(name)).keys()).map(r=>new URL(r.url).pathname),resources.cache);for(const f of fixture.topics)assert(cached.some(p=>p.endsWith('/'+f.download)));
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),preserved.key),preserved.value);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await page.screenshot({path:path.join(results,'finales-mobile-offline-'+mode+'.png'),fullPage:true});
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(results,'finales-desktop-'+mode+'.png'),fullPage:true});
  const message=(mode?'Alternative':'Main')+' entry: approved legacy readings/exams retained inside Semanas Azules, '+totalQuestions+' total questions, cards, back navigation, mobile, offline reload and exact Word downloads, existing progress retained';passed.push(message);console.log('PASS: '+message);await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(results,'results.json'),JSON.stringify({passed},null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(()=>server.close());
