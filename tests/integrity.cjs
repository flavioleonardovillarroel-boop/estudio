const fs=require('fs'), path=require('path'),vm=require('vm'),crypto=require('crypto'),cp=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const current=fs.readFileSync(process.env.ESTUDIO_HTML||path.join(root,'index.html'),'utf8');
const baseline=cp.execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show','77e6d56:index.html'],{encoding:'utf8',maxBuffer:8e6});
function data(html){const sb={};vm.createContext(sb);for(const name of ['PIC','PICLAB','CONTENIDO']){const start=html.indexOf('var '+name+' = {');const end=html.indexOf('\n};',start);assert(start>=0&&end>start);vm.runInContext(html.slice(start,end+3),sb);}return {PIC:sb.PIC,PICLAB:sb.PICLAB,CONTENIDO:sb.CONTENIDO};}
function hash(obj){return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');}
const original=data(baseline),actual=data(current),normalized=data(current);
const lre=actual.CONTENIDO.materias.find(m=>m.id==='m_lre');
assert.equal(lre.unidades.length,6);assert.deepEqual(Array.from(actual.CONTENIDO.materias.find(m=>m.id==='m_logistica').unidades),['log_villar',...lre.unidades]);
const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/historia-imagenes.json'),'utf8'));
const t=normalized.CONTENIDO.temas.find(t=>t.id==='hist_repaso'),old=original.CONTENIDO.temas.find(t=>t.id==='hist_repaso');
assert.equal(t.preguntas.length,30);assert.equal(t.secciones.length,22);assert.equal(t.conceptos.length,20);assert.equal(JSON.stringify(t.preguntas.slice(20)),JSON.stringify(fixture.visualQuestions));
for(const x of fixture.images){assert(normalized.PIC[x.key].startsWith('data:image/png;base64,'));assert.equal(crypto.createHash('sha256').update(Buffer.from(normalized.PIC[x.key].split(',')[1],'base64')).digest('hex'),x.sha256);assert.equal(t.secciones[x.point].pic,x.key);delete normalized.PIC[x.key];delete normalized.PICLAB[x.key];if(old.secciones[x.point].pic)t.secciones[x.point].pic=old.secciones[x.point].pic;else delete t.secciones[x.point].pic;}
t.preguntas=t.preguntas.slice(0,20);t.secciones=t.secciones.slice(0,21);t.desc=old.desc;
assert.equal(hash(normalized),hash(original),'Original source answers and all other academic content and images must be preserved');
assert.equal(actual.CONTENIDO.temas.length,30);assert.equal(actual.CONTENIDO.materias.length,9);assert.equal(actual.CONTENIDO.temas.reduce((n,t)=>n+t.preguntas.length,0),648);
assert(!/TG_TOKEN|TG_CHAT|api\.telegram\.org|function tg\(|function devTag\(/.test(current));
const patterns=[/\b\d{6,}:[A-Za-z0-9_-]{20,}\b/,/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,/\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
for(const pattern of patterns)assert(!pattern.test(current),'Potential embedded secret found (value omitted)');
const scripts=[...current.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
for(const s of scripts)new vm.Script(s[1]);
assert.equal((current.match(/serviceWorker\.register/g)||[]).length,1);
for(const p of ['sw.js','source-entry/sw.js'])new vm.Script(fs.readFileSync(path.join(root,p),'utf8'));
for(const p of ['manifest.webmanifest','source-entry/manifest.webmanifest'])JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
console.log('PASS: 8 exact source images, 10 visual questions, original answers and other subjects preserved; 9/30/648 counts, credential scan and syntax');
