const fs=require('fs'), path=require('path'),vm=require('vm'),crypto=require('crypto'),cp=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const current=fs.readFileSync(process.env.ESTUDIO_HTML||path.join(root,'index.html'),'utf8');
const baseline=cp.execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show','d1f8b79:index.html'],{encoding:'utf8',maxBuffer:20e6});
function data(html){const sb={};vm.createContext(sb);for(const name of ['PIC','PICLAB','CONTENIDO']){const start=html.indexOf('var '+name+' = {');const end=html.indexOf('\n};',start);assert(start>=0&&end>start);vm.runInContext(html.slice(start,end+3),sb);}return {PIC:sb.PIC,PICLAB:sb.PICLAB,CONTENIDO:sb.CONTENIDO};}
function hash(obj){return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');}
const original=data(baseline),actual=data(current),normalized=data(current);
const lre=actual.CONTENIDO.materias.find(m=>m.id==='m_lre');
assert.equal(lre.unidades.length,6);assert.deepEqual(Array.from(actual.CONTENIDO.materias.find(m=>m.id==='m_logistica').unidades),['log_villar',...lre.unidades]);
const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/tiro-modulo.json'),'utf8'));
const t=actual.CONTENIDO.temas.find(t=>t.id==='tiro_parcial_mote');assert.equal(JSON.stringify(t),JSON.stringify(fixture));
assert.deepEqual(Array.from(actual.CONTENIDO.materias.find(m=>m.id==='m_tiro').unidades),['tiro_parcial_mote']);
assert.deepEqual(Array.from(actual.CONTENIDO.materias.find(m=>m.id==='m_historia').unidades),['hist_ud4']);
const fuente=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/tiro-fuente.json'),'utf8'));
for(const [k,f] of [['tiro_mote_grafica','Infografía de instrucción de tiro MOTE.png'],['tiro_mote_poligono','Organización MOTE del polígono de tiro.png']])assert.equal(crypto.createHash('sha256').update(Buffer.from(actual.PIC[k].split(',')[1],'base64')).digest('hex'),fuente.graficas.find(x=>x.archivo===f).sha256);
normalized.CONTENIDO.temas=normalized.CONTENIDO.temas.filter(t=>t.id!=='tiro_parcial_mote');normalized.CONTENIDO.materias=normalized.CONTENIDO.materias.filter(m=>m.id!=='m_tiro');for(const k of ['tiro_mote_grafica','tiro_mote_poligono']){delete normalized.PIC[k];delete normalized.PICLAB[k];}
assert.equal(hash(normalized),hash(original),'Original source answers and all other academic content and images must be preserved');
assert.equal(actual.CONTENIDO.temas.length,31);assert.equal(actual.CONTENIDO.materias.length,10);assert.equal(actual.CONTENIDO.temas.reduce((n,t)=>n+t.preguntas.length,0),663);
assert(!/TG_TOKEN|TG_CHAT|api\.telegram\.org|function tg\(|function devTag\(/.test(current));
const patterns=[/\b\d{6,}:[A-Za-z0-9_-]{20,}\b/,/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,/\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
for(const pattern of patterns)assert(!pattern.test(current),'Potential embedded secret found (value omitted)');
const scripts=[...current.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
for(const s of scripts)new vm.Script(s[1]);
assert.equal((current.match(/serviceWorker\.register/g)||[]).length,1);
for(const p of ['sw.js','source-entry/sw.js'])new vm.Script(fs.readFileSync(path.join(root,p),'utf8'));
for(const p of ['manifest.webmanifest','source-entry/manifest.webmanifest'])JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
console.log('PASS: Tiro exact fixture and original image, all existing subjects preserved; 10/31/663 counts, credential scan and syntax');
