const fs=require('fs'), path=require('path'),vm=require('vm'),crypto=require('crypto'),cp=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const current=fs.readFileSync(process.env.ESTUDIO_HTML||path.join(root,'index.html'),'utf8');
const baseline=cp.execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show','7c92d30:index.html'],{encoding:'utf8',maxBuffer:8e6});
function data(html){const sb={};vm.createContext(sb);for(const name of ['PIC','PICLAB','CONTENIDO']){const start=html.indexOf('var '+name+' = {');const end=html.indexOf('\n};',start);assert(start>=0&&end>start);vm.runInContext(html.slice(start,end+3),sb);}return {PIC:sb.PIC,PICLAB:sb.PICLAB,CONTENIDO:sb.CONTENIDO};}
function hash(obj){return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');}
const original=data(baseline),actual=data(current),normalized=data(current);
const lre=actual.CONTENIDO.materias.find(m=>m.id==='m_lre');
assert.equal(lre.unidades.length,6);assert.deepEqual(Array.from(actual.CONTENIDO.materias.find(m=>m.id==='m_logistica').unidades),['log_villar',...lre.unidades]);
const examples=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/lre-ejemplos.json'),'utf8'));
for(const x of examples){
 const t=normalized.CONTENIDO.temas.find(t=>t.id===x.id),last=t.secciones.pop();
 assert.equal(last.titulo,'Ejemplo visual de llenado · práctica guiada');assert.equal(last.pic,x.key);assert.equal(JSON.stringify(last.parrafos),JSON.stringify(x.paragraphs));
 assert(/^data:image\/jpeg;base64,/.test(normalized.PIC[x.key]));assert(normalized.PICLAB[x.key].includes('datos ficticios'));delete normalized.PIC[x.key];delete normalized.PICLAB[x.key];
}
normalized.CONTENIDO.materias[normalized.CONTENIDO.materias.findIndex(m=>m.id==='m_logistica')]=original.CONTENIDO.materias.find(m=>m.id==='m_logistica');
assert.equal(hash(normalized),hash(original),'Only Logistica LRE links, three filling examples and their images may change');
assert.equal(actual.CONTENIDO.temas.length,30);assert.equal(actual.CONTENIDO.materias.length,9);assert.equal(actual.CONTENIDO.temas.reduce((n,t)=>n+t.preguntas.length,0),638);
assert(!/TG_TOKEN|TG_CHAT|api\.telegram\.org|function tg\(|function devTag\(/.test(current));
const patterns=[/\b\d{6,}:[A-Za-z0-9_-]{20,}\b/,/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,/\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
for(const pattern of patterns)assert(!pattern.test(current),'Potential embedded secret found (value omitted)');
const scripts=[...current.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
for(const s of scripts)new vm.Script(s[1]);
assert.equal((current.match(/serviceWorker\.register/g)||[]).length,1);
for(const p of ['sw.js','source-entry/sw.js'])new vm.Script(fs.readFileSync(path.join(root,p),'utf8'));
for(const p of ['manifest.webmanifest','source-entry/manifest.webmanifest'])JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
console.log('PASS: exact remaining academic/PIC/PICLAB preservation, 9/30/638 counts; Logistica shares LRE modules and three illustrated filling examples, credential scan, syntax and single SW registration');
