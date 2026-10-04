const SOURCE_HTML = process.env.ESTUDIO_HTML || require('path').resolve(__dirname, '../../index.html');
const fs = require('fs');
const src = fs.readFileSync(SOURCE_HTML, 'utf8');
const m = src.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.log('NO SCRIPT'); process.exit(1); }
const code = m[1];

const store = {};
class RealEl {
  constructor(){ this.html=''; this.style={}; this.dataset={}; this.disabled=false; this.value='';
    this.classList={add(){},remove(){},toggle(){},contains(){return false;}};
  }
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
  querySelector: () => null,
  querySelectorAll: () => [],
  documentElement: new RealEl(),
  createElement: () => new RealEl(),
  body: new RealEl(),
};
global.navigator = { userAgent: 'Node', serviceWorker: { register(){ return Promise.resolve(); } }, clipboard: null, share: null };
global.localStorage = { getItem:(k)=> store[k]!==undefined ? store[k] : null, setItem:(k,v)=>{store[k]=String(v);}, removeItem:(k)=>{delete store[k];} };
global.window = global;
global.requestAnimationFrame = (f)=>f();
global.addEventListener = ()=>{};
global.fetch = ()=>Promise.resolve({ ok:false, clone:()=>({}), json:()=>Promise.resolve({}) });
global.alert = ()=>{}; global.confirm = ()=>false; global.Intl = Intl;

try {
  eval(code);
  const t = CONTENIDO.temas.find(x => x.id === 'sust_peligrosas');
  if (!t) throw new Error('tema sust_peligrosas no encontrado');

  // ---- 1. PIC registry integrity (solo los pictogramas ADR: el registro tambien tiene las imagenes LRE)
  const keys = Object.keys(PIC).filter(k => k.indexOf('lre_') !== 0 && k.indexOf('hist_repaso_') !== 0);
  if (keys.length !== 13) throw new Error('esperaba 13 pictogramas ADR, hay ' + keys.length);
  keys.forEach(k => { if (!PIC[k].startsWith('data:image/png;base64,iVBORw0KGgo')) throw new Error('data-URI inválida: ' + k); });
  console.log('PIC registry OK (13 data-URIs)');

  // ---- 2. materia registered
  const mat = CONTENIDO.materias.find(x => x.id === 'm_sustpel');
  if (!mat) throw new Error('materia m_sustpel no registrada');
  if (mat.unidades.indexOf('sust_peligrosas') === -1) throw new Error('materia no apunta al tema');
  console.log('materia OK (' + mat.nombre + ')');

  // ---- 3. every pic/img/grid key resolves
  const used = new Set();
  t.secciones.forEach(s => { if (s.pic) used.add(s.pic); if (s.grid) s.grid.forEach(g => used.add(g)); });
  t.preguntas.forEach(q => { if (q.img) used.add(q.img); if (q.img2) used.add(q.img2); });
  const missing = [...used].filter(k => !PIC[k]);
  if (missing.length) throw new Error('claves sin imagen: ' + missing.join(','));
  if (used.size !== 13) throw new Error('esperaba 13 pictogramas usados, hay ' + used.size);
  console.log('content image refs OK (' + used.size + ' pictogramas usados)');

  // ---- 4. leer() renders grid + pics
  const body = els.bodyVista;
  leer(t, body);
  const html = body.innerHTML;
  if ((html.match(/class="picItem"/g) || []).length < 13) throw new Error('leer: falta la grilla de 13 pictogramas');
  if ((html.match(/class="picBig"/g) || []).length < 13) throw new Error('leer: faltan pictogramas de sección');
  if ((html.match(/data:image\/png/g) || []).length < 26) throw new Error('leer: imágenes embebidas insuficientes');
  console.log('leer() OK (grilla + 13 pictogramas de sección)');

  // ---- 5. quiz intro
  const bodyEx = els.bodyEx;
  quiz(t, bodyEx);
  if (bodyEx.html.indexOf('Sustancias Peligrosas') === -1) throw new Error('intro del examen no muestra la materia');
  console.log('quiz intro OK');

  // ---- 6. render an image question directly via the shared carta path
  // find the mc question that carries an image, mount it and assert the <img> is present
  const qImg = t.preguntas.find(q => q.img);
  if (!qImg) throw new Error('no hay preguntas con imagen');
  if (qImg.tipo !== 'mc') throw new Error('pregunta con imagen no es mc');
  if (!qImg.o || qImg.o.length !== 4) throw new Error('pregunta con imagen no tiene 4 opciones');
  if (typeof qImg.c !== 'number') throw new Error('pregunta con imagen sin índice correcto');
  if (!qImg.e) throw new Error('pregunta con imagen sin explicación');
  // the carta() function appends picHTML(q.img,'picQ'); verify picHTML produces the tag
  const tag = picHTML(qImg.img, 'picQ');
  if (tag.indexOf('class="picQ"') === -1 || tag.indexOf('data:image/png') === -1) throw new Error('picQ mal generado');
  console.log('preguntas visuales OK (' + t.preguntas.filter(q=>q.img).length + ' con imagen)');

  // ---- 7. structure: sections, concepts, chronology
  if (t.secciones.length !== 18) throw new Error('secciones != 18');
  if (t.conceptos.length < 20) throw new Error('conceptos insuficientes');
  if (t.cronologia.length !== 13) throw new Error('cronología != 13 (una por clase)');
  if (t.preguntas.length < 35) throw new Error('preguntas insuficientes');
  console.log('estructura OK (' + t.secciones.length + ' sec, ' + t.conceptos.length + ' con, ' + t.cronologia.length + ' cro, ' + t.preguntas.length + ' preg)');

  console.log('SUSTANCIAS SMOKE PASS');
} catch (e) {
  console.log('SUSTANCIAS SMOKE FAIL: ' + e.message);
  console.log((e.stack||'').split('\n').slice(0,6).join('\n'));
  process.exit(1);
}