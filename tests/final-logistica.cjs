const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');
const newId = 'final_logistica_repaso';

function objectFromHtml(html) {
  const marker = 'var CONTENIDO = ';
  const start = html.indexOf(marker);
  assert(start >= 0, 'CONTENIDO debe existir');
  const brace = html.indexOf('{', start);
  let depth = 0, string = false, escape = false, end = -1;
  for (let i = brace; i < html.length; i++) {
    const c = html[i];
    if (string) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') string = false;
    } else if (c === '"') string = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) { end = i + 1; break; }
  }
  assert(end > 0, 'CONTENIDO debe cerrar');
  return JSON.parse(html.slice(brace, end));
}

function withoutNewMaterial(data) {
  const copy = JSON.parse(JSON.stringify(data));
  copy.temas = copy.temas.filter(t => t.id !== newId);
  const log = copy.materias.find(m => m.id === 'm_logistica');
  if (log) log.unidades = log.unidades.filter(id => id !== newId);
  copy.materias = copy.materias.filter(m => m.id !== 'm_final_logistica');
  return copy;
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sourceHtml = fs.readFileSync(path.join(root, 'source-entry', 'estudio.html'), 'utf8');
assert.equal(html, sourceHtml, 'Las dos copias HTML deben ser idénticas');
const data = objectFromHtml(html);
assert.equal(data.materias[0].id, 'm_final_logistica');
assert.equal(data.materias[0].nombre, 'Final de Logística');
assert.deepEqual(data.materias[0].unidades, [newId]);
assert.equal(data.temas[0].id, newId);
const topic = data.temas[0];
assert.equal(topic.nombre, 'Repaso Final de Logística');
assert.equal(topic.secciones.length, 7);
assert.equal(topic.conceptos.length, 45);
assert.equal(topic.cronologia.length, 19);
assert.equal(topic.preguntas.length, 47);
for (const q of topic.preguntas) {
  assert.equal(q.tipo, 'mc');
  assert.equal(q.o.length, 4);
  assert.equal(new Set(q.o).size, 4);
  assert(Number.isInteger(q.c) && q.c >= 0 && q.c < q.o.length);
}
const text = topic.secciones.flatMap(s => s.parrafos).join('\n');
for (const required of ['Arsenales', 'Intendencia', 'Veterinaria', 'Transporte', 'Construcciones', 'Seguridad contra Accidentes', 'SRE 2408-1', 'SRE 2408-14', 'SRE 2404', 'SRE 2408 sin sufijo']) assert(text.includes(required), `Falta contenido: ${required}`);
for (const forbidden of ['SRE 2408-15', 'SRE 2408-2', 'SRE 2408-6', 'SRE 2408-7', 'SRE 2408-11']) assert(!text.includes(forbidden), `No debe inventar ni incluir ${forbidden}`);
assert(text.includes('final-logistica-repaso.docx'));
for (const dir of ['', 'source-entry']) {
  const sw = fs.readFileSync(path.join(root, dir, 'sw.js'), 'utf8');
  assert(sw.includes(dir ? 'estudio-source-v41' : 'estudio-v41'));
  assert(sw.includes('./materiales/final-logistica-repaso.docx'));
  const doc = fs.readFileSync(path.join(root, dir, 'materiales', 'final-logistica-repaso.docx'));
  assert(doc.length > 1000);
}

let baseline;
try { baseline = cp.execFileSync('git', ['show', 'HEAD:index.html'], { cwd: root, encoding: 'utf8', maxBuffer: 20e6 }); }
catch { baseline = ''; }
if (baseline.includes('m_final_logistica')) baseline = cp.execFileSync('git', ['show', 'HEAD^:index.html'], { cwd: root, encoding: 'utf8', maxBuffer: 20e6 });
if (baseline) assert.deepEqual(withoutNewMaterial(data), objectFromHtml(baseline), 'Se conservaron materias y módulos anteriores');
console.log('PASS: Final de Logística, contenido, examen MC, Word descargable, SW v41 y preservación verificados');
