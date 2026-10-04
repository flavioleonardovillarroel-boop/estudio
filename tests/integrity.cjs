const fs=require('fs'), path=require('path'),vm=require('vm'),crypto=require('crypto'),cp=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const current=fs.readFileSync(process.env.ESTUDIO_HTML||path.join(root,'index.html'),'utf8');
const baseline=cp.execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show','7e14b88:index.html'],{encoding:'utf8',maxBuffer:8e6});
function data(html){const sb={};vm.createContext(sb);for(const name of ['PIC','PICLAB','CONTENIDO']){const start=html.indexOf('var '+name+' = {');const end=html.indexOf('\n};',start);assert(start>=0&&end>start);vm.runInContext(html.slice(start,end+3),sb);}return {PIC:sb.PIC,PICLAB:sb.PICLAB,CONTENIDO:sb.CONTENIDO};}
function hash(obj){return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');}
const expected=data(baseline),actual=data(current); const removed=["historia_ud1", "historia", "historia_ud3", "hist_cuest", "hist_ud3g", "log_tp2", "log_parc", "log_trab", "log_pers"]; expected.CONTENIDO.temas=expected.CONTENIDO.temas.filter(t=>!removed.includes(t.id));
expected.CONTENIDO.materias.find(m=>m.id==='m_historia').unidades=['hist_repaso']; expected.CONTENIDO.materias.find(m=>m.id==='m_historia').descripcion="Repaso de UD 2 y UD 3 basado en la última transcripción de las hojas de avanzada."; assert.deepEqual(Array.from(actual.CONTENIDO.materias.find(m=>m.id==='m_historia').unidades),['hist_repaso']);
expected.CONTENIDO.materias.find(m=>m.id==='m_logistica').unidades=['log_villar']; expected.CONTENIDO.materias.find(m=>m.id==='m_logistica').descripcion="Logística Villar: 13 preguntas y respuestas de la última transcripción de las hojas manuscritas."; assert.deepEqual(Array.from(actual.CONTENIDO.materias.find(m=>m.id==='m_logistica').unidades),['log_villar']);
assert.equal(hash(actual),hash(expected),'Only authorized module removals and matter descriptions may change'); assert.equal(actual.CONTENIDO.temas.length,30); assert.equal(actual.CONTENIDO.materias.length,9); assert.equal(actual.CONTENIDO.temas.reduce((n,t)=>n+t.preguntas.length,0),638); assert(!actual.CONTENIDO.temas.some(t=>removed.includes(t.id)));
assert(!/TG_TOKEN|TG_CHAT|api\.telegram\.org|function tg\(|function devTag\(/.test(current));
const patterns=[/\b\d{6,}:[A-Za-z0-9_-]{20,}\b/,/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,/\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
for(const pattern of patterns)assert(!pattern.test(current),'Potential embedded secret found (value omitted)');
const scripts=[...current.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
for(const s of scripts)new vm.Script(s[1]);
assert.equal((current.match(/serviceWorker\.register/g)||[]).length,1);
for(const p of ['sw.js','source-entry/sw.js'])new vm.Script(fs.readFileSync(path.join(root,p),'utf8'));
for(const p of ['manifest.webmanifest','source-entry/manifest.webmanifest'])JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
console.log('PASS: exact remaining academic/PIC/PICLAB preservation, 9/30/638 counts; Historia and Logistica retain only latest modules, credential scan, syntax and single SW registration');
