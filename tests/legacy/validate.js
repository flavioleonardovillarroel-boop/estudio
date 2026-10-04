const SOURCE_HTML = process.env.ESTUDIO_HTML || require('path').resolve(__dirname, '../../index.html');
const fs = require("fs");
const vm = require("vm");
const s = fs.readFileSync(SOURCE_HTML, "utf8");
const start = s.indexOf("var CONTENIDO = {");
let depth = 0, i = start, inStr = false, esc = false, objEnd = -1;
for (; i < s.length; i++) {
  const c = s[i];
  if (inStr) {
    if (esc) { esc = false; }
    else if (c === "\\") { esc = true; }
    else if (c === '"') { inStr = false; }
    continue;
  }
  if (c === '"') { inStr = true; continue; }
  if (c === "{") depth++;
  else if (c === "}") {
    depth--;
    if (depth === 0) { objEnd = i; break; }
  }
}
if (objEnd === -1) { console.log("ERROR: no se encontro cierre del objeto"); process.exit(1); }
let block = s.slice(start, objEnd + 1);
block = block.replace(/\}\s*;?\s*$/, "};");
// el registro PIC vive fuera de CONTENIDO: incluirlo para validar las imagenes
const picMatch = s.match(/var PIC = \{[\s\S]*?\n\};/);
if (picMatch) block = picMatch[0] + "\n" + block;
const sandbox = {};
vm.createContext(sandbox);
try {
  vm.runInContext(block, sandbox);
  const c = sandbox.CONTENIDO;
  console.log("OK: CONTENIDO evaluado,", c.temas.length, "temas");
  const ids = new Set();
  for (const t of c.temas) {
    if (ids.has(t.id)) { console.log("DUPLICADO id:", t.id); process.exit(1); }
    ids.add(t.id);
    if (t.id === "criminalistica") { console.log("ERROR: criminalistica sigue presente"); process.exit(1); }
    const tipos = {};
    for (const q of t.preguntas) {
      const tp = q.tipo || "mc";
      tipos[tp] = (tipos[tp] || 0) + 1;
      if (tp === "completar" && !/____/.test(q.p)) { console.log("completar sin ____ en", t.id, "->", q.p); process.exit(1); }
      if (tp === "guia" && !(q.r || q.e)) { console.log("guia sin respuesta modelo (r/e) en", t.id, "->", q.p); process.exit(1); }
      if (tp === "vf" && typeof q.v !== "boolean") { console.log("vf sin booleano v en", t.id, "->", q.p); process.exit(1); }
      if (tp === "mc") {
        if (!Array.isArray(q.o) || q.o.length < 2) { console.log("mc sin opciones en", t.id, "->", q.p); process.exit(1); }
        if (typeof q.c !== "number" || q.c < 0 || q.c >= q.o.length) { console.log("mc con indice fuera de rango en", t.id, "->", q.p); process.exit(1); }
        if (new Set(q.o).size !== q.o.length) { console.log("mc con opciones duplicadas en", t.id, "->", q.p); process.exit(1); }
      }
    }
    // crono() renderiza c.fecha y c.dato: si faltan, la vista muestra "undefined"
    for (const cr of (t.cronologia || [])) {
      if (typeof cr.fecha !== "string" || !cr.fecha) { console.log("cronologia sin fecha en", t.id, "->", JSON.stringify(cr).slice(0, 80)); process.exit(1); }
      if (typeof cr.dato !== "string" || !cr.dato) { console.log("cronologia sin dato en", t.id, "->", cr.fecha); process.exit(1); }
    }
    // toda clave de imagen usada debe existir en el registro PIC
    const picKeys = new Set();
    for (const sec of t.secciones) {
      if (sec.pic) picKeys.add(sec.pic);
      if (sec.grid) sec.grid.forEach(g => picKeys.add(g));
    }
    for (const q of t.preguntas) { if (q.img) picKeys.add(q.img); if (q.img2) picKeys.add(q.img2); }
    for (const k of picKeys) {
      if (!sandbox.PIC || !sandbox.PIC[k]) { console.log("imagen inexistente en", t.id, "->", k); process.exit(1); }
    }
    console.log("- " + t.id + " | secciones:" + t.secciones.length + " conceptos:" + t.conceptos.length + " crono:" + (t.cronologia||[]).length + " preguntas:" + t.preguntas.length + " tipos:" + JSON.stringify(tipos) + " | desc:" + (t.desc ? "si" : "no"));
  }
  const materias = c.materias || [];
  for (const m of materias) {
    for (const id of m.unidades) {
      if (!ids.has(id)) { console.log("ERROR: materia", m.id, "refiere tema inexistente", id); process.exit(1); }
    }
    console.log("- materia " + m.id + " (" + m.nombre + ") -> [" + m.unidades.join(", ") + "]");
  }
  const enM = {};
  materias.forEach(m => m.unidades.forEach(u => enM[u] = (enM[u] || 0) + 1));
  for (const k in enM) if (enM[k] > 1) { const owners=materias.filter(m=>m.unidades.includes(k)).map(m=>m.id).sort(); const lre=materias.find(m=>m.id==="m_lre"); const sharedLRE=lre.unidades.includes(k)&&owners.join(",")==="m_logistica,m_lre"; if(!sharedLRE){ console.log("ERROR: tema compartido fuera de LRE y Logistica:", k); process.exit(1); } }
  console.log("TOTAL preguntas:", c.temas.reduce((a, t) => a + t.preguntas.length, 0));
} catch (e) {
  console.log("ERROR eval:", e.message);
  process.exit(1);
}