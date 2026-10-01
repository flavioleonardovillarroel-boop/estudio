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
  const IDS = ['mando_cap1','mando_cap2','mando_cap3','mando_cap4','mando_cap5','mando_cap6','mando_cap7','mando_cap8','mando_gabinete'];
  const temas = IDS.map(id => { const t = CONTENIDO.temas.find(x=>x.id===id); if(!t) throw new Error('falta tema '+id); return t; });

  const mat = CONTENIDO.materias.find(x=>x.id==='m_etica_mando');
  if(!mat) throw new Error('falta materia m_etica_mando');
  if(mat.unidades.length!==9) throw new Error('materia con '+mat.unidades.length+' unidades');
  for(const id of IDS) if(!mat.unidades.includes(id)) throw new Error('materia no incluye '+id);
  console.log('materia OK ('+mat.nombre+', '+mat.unidades.length+' unidades)');

  temas.forEach(t=>{
    if(!t.desc) throw new Error('sin desc: '+t.id);
    if(t.secciones.length<4) throw new Error('pocas secciones: '+t.id);
    if(t.conceptos.length<4) throw new Error('pocos conceptos: '+t.id);
    if(t.conceptos.length!==new Set(t.conceptos.map(c=>c.t)).size) throw new Error('conceptos duplicados: '+t.id);
    if(!t.cronologia.length) throw new Error('sin cronologia: '+t.id);
    t.cronologia.forEach(c=>{
      if(typeof c.fecha!=='string'||!c.fecha) throw new Error('crono sin fecha: '+t.id);
      if(typeof c.dato!=='string'||!c.dato) throw new Error('crono sin dato: '+t.id);
    });
    if(t.preguntas.length<15) throw new Error('pocas preguntas: '+t.id);
    t.preguntas.forEach(q=>{
      if(q.tipo==='mc'){
        if(typeof q.c!=='number'||q.c<0||q.c>=q.o.length) throw new Error('mc indice malo: '+t.id+' / '+q.p);
        if(new Set(q.o).size!==q.o.length) throw new Error('mc duplicadas: '+t.id+' / '+q.p);
        if(q.o.some(x=>typeof x!=='string'||!x)) throw new Error('mc opcion vacia: '+t.id+' / '+q.p);
      }
      if(q.tipo==='guia' && !q.r && !q.e) throw new Error('guia sin r ni e: '+t.id+' / '+q.p);
      if(q.tipo==='guia' && !q.f) console.log('  aviso: guia sin f: '+t.id+' / '+q.p.slice(0,50));
      if(q.tipo==='completar' && !/____/.test(q.p)) throw new Error('completar sin ____: '+t.id);
      if(q.tipo==='vf' && typeof q.v!=='boolean') throw new Error('vf sin v: '+t.id);
      const all = [q.p,q.e,q.r,q.f].filter(Boolean).join(' ');
      if(/\bundefined\b/.test(all)) throw new Error('undefined en texto: '+t.id+' / '+q.p);
    });
  });
  console.log('estructura + contenido OK en las 9 unidades');

  temas.forEach(t=>{
    const body = els.bodyVista; body.innerHTML='';
    leer(t, body);
    if(body.html.indexOf(t.secciones[0].titulo)===-1) throw new Error('leer no renderiza: '+t.id);
    if(body.html.indexOf('sec-blk')===-1) throw new Error('leer sin bloques: '+t.id);
    const b2 = els.bodyEx; b2.innerHTML='';
    quiz(t, b2);
    if(b2.html.indexOf('Examen')===-1) throw new Error('quiz no renderiza: '+t.id);
  });
  console.log('leer() + quiz() OK en las 9 unidades');

  const allText = JSON.stringify(temas).toLowerCase();
  ['mfp 51-13','estévez','pradera del ganso','san martín','belgrano','tucumán','güemes','maipú','granaderos',
   'operaciones militares de paz','antártida','bautismo de fuego','rumor','pánico','art. 1.008','6.004','8.003',
   'malvinas','7.2'].forEach(k=>{ if(allText.indexOf(k)===-1) console.log('  AVISO: no aparece "'+k+'"'); });

  console.log('total preguntas del modulo:', temas.reduce((a,t)=>a+t.preguntas.length,0));
  console.log('MANDO SMOKE PASS');
} catch(e){
  console.log('MANDO SMOKE FAIL: '+e.message);
  console.log((e.stack||'').split('\n').slice(0,5).join('\n'));
  process.exit(1);
}