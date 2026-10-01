const SOURCE_HTML = process.env.ESTUDIO_HTML || require('path').resolve(__dirname, '../../index.html');
const fs = require('fs');
const src = fs.readFileSync(SOURCE_HTML, 'utf8');
const m = src.match(/<script>([\s\S]*)<\/script>/);
const code = m[1];
const store = {};
class RealEl {
  constructor(){ this.html=''; this.style={}; this.dataset={}; this.disabled=false; this.value='';
    this.classList={add(){},remove(){},toggle(){},contains(){return false;}}; }
  set innerHTML(v){ this.html=v; }
  get innerHTML(){ return this.html; }
  querySelectorAll(){ return []; } querySelector(){ return null; }
  getContext(){ return {}; } appendChild(){} removeChild(){} focus(){} click(){} scrollIntoView(){}
}
const els = { view: new RealEl(), bodyVista: new RealEl(), bodyEx: new RealEl() };
global.document = { getElementById:(id)=>els[id]||new RealEl(), querySelector:()=>null, querySelectorAll:()=>[],
  documentElement:new RealEl(), createElement:()=>new RealEl(), body:new RealEl() };
global.navigator = { userAgent:'Node', serviceWorker:{register(){return Promise.resolve();}}, clipboard:null, share:null };
global.localStorage = { getItem:(k)=>store[k]!==undefined?store[k]:null, setItem:(k,v)=>{store[k]=String(v);}, removeItem:(k)=>{delete store[k];} };
global.window = global; global.requestAnimationFrame=(f)=>f(); global.addEventListener=()=>{};
global.fetch=()=>Promise.resolve({ok:false,clone:()=>({}),json:()=>Promise.resolve({})});
global.alert=()=>{}; global.confirm=()=>false; global.Intl=Intl;

try {
  eval(code);
  const IDS = ['aux_sala_armas','aux_parque_deposito','aux_intendencia','aux_sintesis'];
  const temas = IDS.map(id => { const t = CONTENIDO.temas.find(x=>x.id===id); if(!t) throw new Error('falta tema '+id); return t; });

  // materia
  const mat = CONTENIDO.materias.find(x=>x.id==='m_aux_dep');
  if(!mat) throw new Error('falta materia m_aux_dep');
  if(mat.unidades.length!==4) throw new Error('materia con '+mat.unidades.length+' unidades');
  for(const id of IDS) if(!mat.unidades.includes(id)) throw new Error('materia no incluye '+id);
  console.log('materia OK ('+mat.nombre+', '+mat.unidades.length+' unidades)');

  // por unidad
  temas.forEach(t=>{
    if(!t.desc) throw new Error('sin desc: '+t.id);
    if(t.secciones.length<4) throw new Error('pocas secciones: '+t.id);
    if(t.conceptos.length<10) throw new Error('pocos conceptos: '+t.id);
    if(!t.cronologia.length) throw new Error('sin cronologia: '+t.id);
    t.cronologia.forEach(c=>{
      if(typeof c.fecha!=='string'||!c.fecha) throw new Error('crono sin fecha: '+t.id);
      if(typeof c.dato!=='string'||!c.dato) throw new Error('crono sin dato: '+t.id);
    });
    if(t.preguntas.length<15) throw new Error('pocas preguntas: '+t.id);
    // ninguna respuesta "undefined" por campo faltante
    t.preguntas.forEach(q=>{
      if(q.tipo==='mc'){
        if(typeof q.c!=='number'||q.c<0||q.c>=q.o.length) throw new Error('mc indice malo: '+t.id+' / '+q.p);
        if(new Set(q.o).size!==q.o.length) throw new Error('mc duplicadas: '+t.id+' / '+q.p);
        if(q.o.some(x=>typeof x!=='string'||!x)) throw new Error('mc opcion vacia: '+t.id+' / '+q.p);
      }
      if(q.tipo==='guia' && !q.r) throw new Error('guia sin r: '+t.id+' / '+q.p);
      if(q.tipo==='completar' && !/____/.test(q.p)) throw new Error('completar sin ____: '+t.id);
      if(q.tipo==='vf' && typeof q.v!=='boolean') throw new Error('vf sin v: '+t.id);
      const all = [q.p,q.e,q.r,q.f].filter(Boolean).join(' ');
      if(/\bundefined\b/.test(all)) throw new Error('undefined en texto: '+t.id+' / '+q.p);
    });
  });
  console.log('estructura + contenido OK en las 4 unidades');

  // render real: leer() de cada unidad y quiz()
  temas.forEach(t=>{
    const body = els.bodyVista; body.innerHTML='';
    leer(t, body);
    if(body.html.indexOf(t.secciones[0].titulo)===-1) throw new Error('leer no renderiza: '+t.id);
    if(body.html.indexOf('sec-blk')===-1) throw new Error('leer sin bloques: '+t.id);
    const b2 = els.bodyEx; b2.innerHTML='';
    quiz(t, b2);
    if(b2.html.indexOf('Examen')===-1) throw new Error('quiz no renderiza: '+t.id);
  });
  console.log('leer() + quiz() OK en las 4 unidades');

  // contenido clave del apunte presente
  const allText = JSON.stringify(temas);
  ['RFD 21-01-II','RFD 21-01-III','RFD 21-01-IV','ROP 19-01','RFP 70-01','RVD','Suboficial de Tiro',
   'seriedad','ficha de estante','encargado','Tarjeta o rótulo','DOCUMENTAR','conservar','controlar','informar']
   .forEach(k=>{ if(allText.toLowerCase().indexOf(k.toLowerCase())===-1) console.log('  AVISO: no aparece "'+k+'"'); });

  console.log('total preguntas del modulo:', temas.reduce((a,t)=>a+t.preguntas.length,0));
  console.log('AUXILIARES SMOKE PASS');
} catch(e){
  console.log('AUXILIARES SMOKE FAIL: '+e.message);
  console.log((e.stack||'').split('\n').slice(0,5).join('\n'));
  process.exit(1);
}
