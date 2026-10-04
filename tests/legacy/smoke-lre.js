const SOURCE_HTML = process.env.ESTUDIO_HTML || require('path').resolve(__dirname, '../../index.html');
const fs = require('fs');
const src = fs.readFileSync(SOURCE_HTML, 'utf8');
const m = src.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.log('NO SCRIPT'); process.exit(1); }
const code = m[1];

const store = {};
class RealEl {
  constructor(){ this.html=''; this.style={}; this.dataset={}; this.disabled=false; this.value='';
    this.classList={add(){},remove(){},toggle(){},contains(){return false;}};}
  set innerHTML(v){ this.html=v; }
  get innerHTML(){ return this.html; }
  querySelectorAll(){ return []; }
  querySelector(){ return null; }
  getContext(){ return {}; }
  appendChild(){} removeChild(){} focus(){} click(){} scrollIntoView(){}
}
const els = { view: new RealEl(), bodyVista: new RealEl(), bodyEx: new RealEl() };
global.document = {
  getElementById: (id) => els[id] || new RealEl(),
  querySelector: () => null, querySelectorAll: () => [],
  documentElement: new RealEl(), createElement: () => new RealEl(), body: new RealEl(),
};
global.navigator = { userAgent:'Node', serviceWorker:{ register(){ return Promise.resolve(); } }, clipboard:null, share:null };
global.localStorage = { getItem:(k)=> store[k]!==undefined?store[k]:null, setItem:(k,v)=>{store[k]=String(v);}, removeItem:(k)=>{delete store[k];} };
global.window = global;
global.requestAnimationFrame = (f)=>f();
global.addEventListener = ()=>{};
global.fetch = ()=>Promise.resolve({ ok:false, clone:()=>({}), json:()=>Promise.resolve({}) });
global.alert = ()=>{}; global.confirm = ()=>false; global.Intl = Intl;

let fallos = 0;
function chk(cond, msg){
  if (cond) console.log('  ok   ' + msg);
  else { console.log('  FAIL ' + msg); fallos++; }
}

try {
  eval(code);
  console.log('LRE SMOKE');

  // ---- 1. materia
  const mat = CONTENIDO.materias.find(x => x.id === 'm_lre');
  chk(!!mat, 'materia m_lre registrada');
  chk(mat && mat.unidades.length === 6, 'm_lre declara 6 unidades');
  const IDS = ['lre_contexto','lre_novedades','lre_correctivo','lre_codigos','lre_preventivo','lre_lubricacion'];
  chk(mat && IDS.every(i => mat.unidades.indexOf(i) !== -1), 'unidades LRE todas presentes');

  // ---- 2. temas
  const temas = IDS.map(id => CONTENIDO.temas.find(t => t.id === id));
  chk(temas.every(Boolean), 'los 6 temas LRE existen en CONTENIDO.temas');
  let totP = 0, totSec = 0, totCon = 0, totCro = 0;
  temas.forEach(t => {
    totP += t.preguntas.length; totSec += t.secciones.length;
    totCon += t.conceptos.length; totCro += t.cronologia.length;
    chk(t.desc && t.desc.length > 60, t.id + ': descripcion');
    chk(t.secciones.every(s => s.titulo && s.parrafos && s.parrafos.length), t.id + ': secciones con parrafos');
    chk(t.conceptos.every(c => c.t && c.d), t.id + ': conceptos completos');
    chk(t.cronologia.every(c => c.fecha && c.dato), t.id + ': cronologia completa');
    chk(t.preguntas.every(q => q.p), t.id + ': todas las preguntas con enunciado');
    chk(t.preguntas.filter(q => q.tipo !== 'guia').every(q => q.e), t.id + ': mc/vf/completar con explicacion');
    chk(t.preguntas.filter(q => q.tipo === 'vf').every(q => typeof q.v === 'boolean'), t.id + ': vf con v booleano');
    chk(t.preguntas.filter(q => q.tipo === 'mc').every(q => Array.isArray(q.o) && q.o.length === 4 && typeof q.c === 'number'),
        t.id + ': mc con 4 opciones y c numerico');
    chk(t.preguntas.filter(q => q.tipo === 'completar').every(q => Array.isArray(q.o) && q.o.length),
        t.id + ': completar con o[]');
    chk(t.preguntas.filter(q => q.tipo === 'guia').every(q => q.r && q.f), t.id + ': guia con r y f');
  });
  console.log('  -> ' + totSec + ' secciones, ' + totCon + ' conceptos, ' + totCro + ' cronologia, ' + totP + ' preguntas');

  // ---- 3. imagenes
  const lreKeys = Object.keys(PIC).filter(k => k.indexOf('lre_') === 0);
  chk(lreKeys.length === 23, 'PIC tiene 23 imagenes LRE (hay ' + lreKeys.length + ')');
  chk(lreKeys.every(k => /^data:image\/jpeg;base64,/.test(PIC[k])), 'todas son JPEG data-URI validas');
  chk(lreKeys.every(k => !!PICLAB[k]), 'toda imagen LRE tiene rotulo en PICLAB');
  chk(!Object.keys(PICLAB).some(k => k.indexOf('lre_') !== 0 && !Object.keys(PIC).includes(k)),
      'rotulos sin imagen huerfanos: ninguno');

  const usadas = new Set();
  temas.forEach(t => {
    t.secciones.forEach(s => { if (s.pic) usadas.add(s.pic); });
    t.preguntas.forEach(q => { if (q.img) usadas.add(q.img); if (q.img2) usadas.add(q.img2); });
  });
  const falt = [...usadas].filter(k => !PIC[k]);
  chk(falt.length === 0, 'sin claves de imagen huerfanas' + (falt.length ? ': ' + falt.join(',') : ''));
  console.log('  -> ' + usadas.size + ' imagenes referenciadas por los 6 temas');

  // ---- 4. render: clase grande + pie de imagen
  const tag = picHTML('lre_240814');
  chk(tag.indexOf('class="picForm"') !== -1, 'picHTML usa .picForm para claves lre_');
  chk(tag.indexOf('class="picBig"') === -1, 'no usa .picBig (118px) para LRE');
  chk(tag.indexOf('picCap') !== -1, 'incluye pie de imagen');
  chk(tag.indexOf('data:image/jpeg') !== -1, 'img con data-URI JPEG');
  const tagQ = picHTML('lre_tabla4', 'picQ');
  chk(tagQ.indexOf('class="picForm picFormQ"') !== -1, 'en preguntas usa .picFormQ (mas chica)');
  const tagOld = picHTML('c1');
  chk(tagOld.indexOf('class="picBig"') !== -1, 'los pictogramas ADR siguen con .picBig');
  chk(tagOld.indexOf('picCap') === -1, 'los ADR no obtienen pie LRE');

  // ---- 5. leer() real (acumulo el HTML de cada tema)
  let h = '';
  let conPics = 0;
  temas.forEach(t => {
    const b = new RealEl();
    leer(t, b);
    h += b.innerHTML;
    conPics += t.secciones.filter(s => s.pic).length;
  });
  chk((h.match(/class="picForm"/g) || []).length === conPics, 'leer(): ' + conPics + ' bloques .picForm renderizados');
  chk((h.match(/class="picCap"/g) || []).length === conPics, 'leer(): ' + conPics + ' pies de imagen renderizados');
  chk((h.match(/data:image\/jpeg/g) || []).length === conPics, 'leer(): ' + conPics + ' JPEG embebidos');
  chk(h.indexOf('loading="lazy"') !== -1, 'leer(): imagenes con loading=lazy');
  chk(h.indexOf('picBig') === -1, 'leer(): ningun LRE cae en .picBig de 118px');

  // ---- 6. quiz() real
  const bodyEx = els.bodyEx;
  temas.forEach(t => quiz(t, bodyEx));
  chk(bodyEx.html.indexOf('LRE') !== -1, 'quiz(): muestra la materia LRE');

  // ---- 7. regresion: otros modulos intactos
  chk(CONTENIDO.temas.length === 30, 'CONTENIDO.temas = 30 (22 previos + 6 LRE + Villar + Repaso)');
  chk(CONTENIDO.materias.length === 9, 'CONTENIDO.materias = 9 (8 previas + m_lre)');
  const tot = CONTENIDO.temas.reduce((a,t)=>a+t.preguntas.length,0);
  chk(tot === 638, 'total de preguntas = 638 (508 previas + 97 LRE + 13 Villar + 20 Repaso)');
  const st = CONTENIDO.temas.find(t => t.id === 'sust_peligrosas');
  const stGrids = st ? st.secciones.filter(s => s.grid).length : 0;
  chk(stGrids > 0, 'Sustancias Peligrosas sigue intacta (' + stGrids + ' secciones con grilla)');
  chk(picHTML('c1').indexOf('class="picBig"') !== -1, 'pictogramas ADR sin regresion');

  console.log(fallos ? '\nLRE SMOKE FAIL (' + fallos + ')' : '\nLRE SMOKE PASS');
  if (fallos) process.exit(1);
} catch (e) {
  console.log('LRE SMOKE ERROR: ' + e.message);
  console.log((e.stack||'').split('\n').slice(0,6).join('\n'));
  process.exit(1);
}
