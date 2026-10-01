const fs=require('fs'), path=require('path'),vm=require('vm'),crypto=require('crypto'),cp=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const current=fs.readFileSync(process.env.ESTUDIO_HTML||path.join(root,'index.html'),'utf8');
const baseline=cp.execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show','49edab1:index.html'],{encoding:'utf8',maxBuffer:8e6});
function data(html){const sb={};vm.createContext(sb);for(const name of ['PIC','PICLAB','CONTENIDO']){const start=html.indexOf('var '+name+' = {');const end=html.indexOf('\n};',start);assert(start>=0&&end>start);vm.runInContext(html.slice(start,end+3),sb);}return {PIC:sb.PIC,PICLAB:sb.PICLAB,CONTENIDO:sb.CONTENIDO};}
function hash(obj){return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');}
assert.equal(hash(data(current)),hash(data(baseline)),'Academic content or images changed');
const c=data(current).CONTENIDO;
assert.equal(c.temas.length,38);assert.equal(c.materias.length,9);assert.equal(c.temas.reduce((n,t)=>n+t.preguntas.length,0),881);
assert(!/TG_TOKEN|TG_CHAT|api\.telegram\.org|function tg\(|function devTag\(/.test(current));
const patterns=[/\b\d{6,}:[A-Za-z0-9_-]{20,}\b/,/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,/\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
for(const pattern of patterns)assert(!pattern.test(current),'Potential embedded secret found (value omitted)');
const scripts=[...current.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
for(const s of scripts)new vm.Script(s[1]);
assert.equal((current.match(/serviceWorker\.register/g)||[]).length,1);
for(const p of ['sw.js','source-entry/sw.js'])new vm.Script(fs.readFileSync(path.join(root,p),'utf8'));
for(const p of ['manifest.webmanifest','source-entry/manifest.webmanifest'])JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
console.log('PASS: exact academic/PIC/PICLAB preservation, 9/38/881 counts, credential scan, syntax and single SW registration');
