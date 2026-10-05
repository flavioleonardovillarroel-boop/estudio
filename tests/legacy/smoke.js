const SOURCE_HTML = process.env.ESTUDIO_HTML || require('path').resolve(__dirname, '../../index.html');
const fs = require('fs');
const src = fs.readFileSync(SOURCE_HTML, 'utf8');
const m = src.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.log('NO SCRIPT'); process.exit(1); }
let code = m[1];

const store = {};
class FakeEl {
  constructor(){ this.innerHTML=''; this.textContent=''; this.classList={add(){},remove(){},toggle(){},contains(){return false;}}; this.style={}; this.dataset={}; this.value=''; this.disabled=false; this.children=[]; this.scrollHeight=0; this.scrollTop=0; }
  querySelectorAll(){ return []; }
  querySelector(){ return new FakeEl(); }
  appendChild(c){ this.children.push(c); c.parentNode=this; } removeChild(){} focus(){} click(){} scrollIntoView(){}
}
const els = { view: new FakeEl(), hdTitle: new FakeEl(), btnTema: new FakeEl(), btnUser: new FakeEl(), bodyVista: new FakeEl(), ficha: new FakeEl(), fT: new FakeEl(), fD: new FakeEl(), bodyEx: new FakeEl(), ayPanel: new FakeEl(), ayMsg: new FakeEl(), ayChips: new FakeEl(), ayIn: new FakeEl() };
global.document = {
  getElementById: (id) => els[id] || new FakeEl(),
  querySelector: () => null,
  querySelectorAll: () => [],
  documentElement: new FakeEl(),
  createElement: () => new FakeEl(),
  body: new FakeEl(),
};
global.navigator = { userAgent: 'Node', serviceWorker: { register(){ return Promise.resolve(); } }, clipboard: null, share: null };
global.localStorage = { getItem:(k)=> store[k]!==undefined ? store[k] : null, setItem:(k,v)=>{store[k]=String(v);}, removeItem:(k)=>{delete store[k];} };
global.window = global;
global.requestAnimationFrame = (f)=>f();
global.addEventListener = ()=>{};
global.fetch = ()=>Promise.resolve({ ok:false, clone:()=>({}), json:()=>Promise.resolve({}) });
global.alert = ()=>{};
global.confirm = ()=>false;
global.Intl = Intl;

const errors = [];
global.__origErr = console.error;
try {
  eval(code);
  // ejecutar flujos: login, home, abrirMateria, quiz start
  els.view.innerHTML = '';
  pintarLogin();
  console.log('pintarLogin OK');
  // forzar un usuario guardado y entrar
  estGuardarUsuarios([{id:'u1', nombre:'Eve', clave:'123'}]);
  LS.set('est_uid','u1');
  els.view.innerHTML='';
  home();
  console.log('home OK');
  const mh = CONTENIDO.materias[0];
  els.view.innerHTML='';
  abrirMateria(mh.id);
  console.log('abrirMateria OK');
  els.view.innerHTML='';
  examenMateria(mh.id);
  console.log('examenMateria OK');

  global.__results = [];
  class RealEl {
    constructor(){ this.html=''; this._children=[]; this.style={}; this.dataset={}; this.disabled=false; }
    set innerHTML(v){ this.html=v; this._children=[]; }
    get innerHTML(){ return this.html; }
    querySelectorAll(){ return []; }
    querySelector(){ return null; }
  }
  const realBody = new RealEl();
  const temaLog = CONTENIDO.temas.find(t=>t.id==='log_villar');
  global.document.getElementById = (id)=> {
    if (id==='view') return els.view;
    if (id==='bodyVista' || id==='bodyEx') return realBody;
    if (id==='hdTitle'||id==='btnTema'||id==='btnUser'||id==='almWrap') return els[id];
    if (id==='ayPanel'||id==='ayMsg'||id==='ayChips'||id==='ayIn') return els[id];
    return new RealEl();
  };
  // redirect onclick handlers: realBody.querySelectorAll returns buttons of current html? too complex; test montar paths indirectly via quiz() intro
  document.getElementById = global.document.getElementById;
  // quiz intro render
  quiz(temaLog, realBody);
  const intro = realBody.html;
  if (intro.indexOf('Repaso inteligente') === -1 && intro.indexOf('Examen') === -1) throw new Error('intro fallo');

  // probar estrellas sin DOM
  const p0 = temaLog.preguntas[0];
  toggleEstrella(temaLog.id, p0.p);
  if (estrellasTema(temaLog.id).indexOf(hashP(p0.p)) === -1) throw new Error('estrella no guardo');
  toggleEstrella(temaLog.id, p0.p);
  if (esEstrella(temaLog.id, p0.p)) throw new Error('estrella no destilde');
  console.log('estrellas OK');

  // probar calendario
  if (typeof evList !== 'function') throw new Error('evList no definido');
  evSet([]);
  abrirCalendario();
  const cal0 = els.view.innerHTML;
  if (cal0.indexOf('Agregar fecha') === -1) throw new Error('calendario vacio mal');
  // cargar un evento para las fechas futuras (recomendado: fechas estables)
  function addDias(n){ const d = new Date(); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  evSet([{ id:'evTest', titulo:'Examen Técnica', tipo:'examen', tema:'tec_esp', fecha:addDias(6), nota:'cap 2-3', hecho:false }]);
  const fut = evFaltan(evList()[0].fecha);
  if (fut !== 6) throw new Error('evFaltan devolvio '+fut);
  abrirCalendario();
  if (els.view.innerHTML.indexOf('Examen Técnica') === -1) throw new Error('calendario no muestra evento');
  const cp = cardProximo();
  if (cp.indexOf('Buen momento para un cuestionario') === -1) throw new Error('cardProximo sin sugerencia: ' + cp);
  if (cp.indexOf('Empecemos') === -1) throw new Error('cardProximo sin boton estudiar');
  // forma de edicion
  formEvento('evTest');
  if (els.view.innerHTML.indexOf('Editar fecha') === -1) throw new Error('formEvento edicion mal');
  console.log('calendario OK');

  // almanaque
  const hoy = new Date();
  _alm = null;
  function iso(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  const d5 = new Date(); d5.setDate(5);
  const d20 = new Date(); d20.setDate(20);
  els.almWrap = new RealEl();
  evSet([
    { id:'a1', titulo:'Examen Técnica', tipo:'examen', tema:'tec_esp', fecha:iso(d5), nota:'', hecho:false },
    { id:'a2', titulo:'Entrega TP Didáctica', tipo:'tp', tema:'dem_g3', fecha:iso(d5), nota:'', hecho:false },
    { id:'a3', titulo:'Parcial Historia', tipo:'parcial', tema:'hist_ud4', fecha:iso(d20), nota:'', hecho:false }
  ]);
  renderAlmanaque();
  const alm = els.almWrap.innerHTML;
  if (alm.indexOf('class="d hoy"') === -1) throw new Error('almanaque no marca hoy');
  if (alm.indexOf('ev exam') === -1 || alm.indexOf('ev trab') === -1 || alm.indexOf('ev parc') === -1) throw new Error('almanaque sin colores');
  const idxEx = alm.indexOf('ev exam');
  const idxTp = alm.indexOf('ev trab');
  if (idxEx > idxTp) throw new Error('examen no va arriba del tp: exam=' + idxEx + ' tp=' + idxTp);
  almEstado(hoy.getFullYear(), hoy.getMonth() - 1);
  renderAlmanaque();
  if (els.almWrap.innerHTML.indexOf('ev exam') !== -1) throw new Error('mes anterior no deberia tener eventos');
  console.log('almanaque OK');

  // asistente Tuti
  if (ayResponde('como arranco a estudiar').indexOf('Empezá') === -1 && ayResponde('como arranco a estudiar').indexOf('Dale') === -1) throw new Error('ayResponde basico');
  if (ayResponde('que son las medallas').indexOf('Oro') === -1) throw new Error('ayResponde medallas');
  if (ayResponde('que es el repaso inteligente').indexOf('Repaso inteligente') === -1) throw new Error('ayResponde repaso');
  if (ayResponde('como agrego una fecha').indexOf('calendario') === -1 && ayResponde('como agrego una fecha').indexOf('Calendario') === -1) throw new Error('ayResponde calendario');
  if (ayResponde('zzzz nada que ver').indexOf('No estoy segura') === -1) throw new Error('ayResponde fallback');
  els.ayPanel.classList = { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
  togglAyuda();
  if (els.ayMsg.children.length === 0) throw new Error('togglAyuda no saludo');
  cerrarAyuda();
  console.log('asistente OK');

  console.log('SMOKE PASS');
} catch (e) {
  console.log('SMOKE FAIL: ' + e.message);
  console.log(e.stack.split('\n').slice(0,5).join('\n'));
  process.exit(1);
}