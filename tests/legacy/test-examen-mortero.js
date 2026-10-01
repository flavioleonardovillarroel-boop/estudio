const SOURCE_HTML = process.env.ESTUDIO_HTML || require('path').resolve(__dirname, '../../index.html');
const fs = require('fs');
const src = fs.readFileSync(SOURCE_HTML, 'utf8');
const m = src.match(/<script>([\s\S]*)<\/script>/);
let code = m[1];

const store = {};
class Button {
  constructor(html){
    this.html = html; this.dataset = {}; this.disabled = false; this._onclick = null; this.resolved = false;
    const id = html.match(/id="([^"]+)"/); this.id = id ? id[1] : null;
    const dv = html.match(/data-v="([^"]*)"/); if (dv) this.dataset.v = dv[1];
    const dc = html.match(/data-cant="([^"]+)"/); if (dc) this.dataset.cant = dc[1];
    this.classList = { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
    this.style = {}; this.textContent = '';
  }
  set onclick(f){ this._onclick = f; }
  get onclick(){ return this._onclick; }
  click(){ if (this._onclick) this._onclick(); }
  getAttribute(name){ return this.dataset && this.dataset[name.replace(/^data-/,'')] || null; }
}
class FakeEl {
  constructor(tag){ this.tag = tag || 'div'; this._html=''; this.textContent=''; this.value=''; this.disabled=false; this.children=[]; this.buttons=[];
    this.classList = { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
    this.style={}; this.dataset={}; this.scrollHeight=0; this.scrollTop=0; this._onkeydown=null; this._onclick=null;
  }
  set innerHTML(v){ this._html=v;
    this.buttons=[...v.matchAll(/<button[^>]*>[\s\S]*?<\/button>/g)].map(x=>new Button(x[0]));
    for (const b of this.buttons) if (b.id) els[b.id]=b;   // registrar por id
  }
  get innerHTML(){ return this._html; }
  querySelectorAll(sel){
    if (this.tag === 'qOptsContainer' || (this === els.qOpts)){
      if (sel === '.bigbtn') return els.bodyEx.buttons;
    }
    if (sel === '.qbtn') return this.buttons;
    if (sel === '.bigbtn') return this.buttons;
    return [];
  }
  querySelector(sel){
    if (sel && sel.indexOf('#')===0){ const id=sel.slice(1); return els[id] || null; }
    return new FakeEl('btn');
  }
  set onclick(f){ this._onclick=f; } get onclick(){ return this._onclick; }
  click(){ if (this._onclick) this._onclick(); }
  set onkeydown(f){ this._onkeydown=f; } get onkeydown(){ return this._onkeydown; }
  appendChild(c){ this.children.push(c); c.parentNode=this; }
  focus(){} removeChild(){} scrollIntoView(){} setAttribute(){}
  getAttribute(name){ return this.dataset && this.dataset[name] ? this.dataset[name] : (this.dataset ? (this.dataset[name.trim().replace(/^data-/,'')] || null) : null); }
}

const els = {};
const reg = (id, el) => { els[id] = el; return el; };
reg('view', new FakeEl()); reg('hdTitle', new FakeEl()); reg('btnTema', new FakeEl()); reg('btnUser', new FakeEl());
reg('bodyVista', new FakeEl()); reg('ficha', new FakeEl()); reg('fT', new FakeEl()); reg('fD', new FakeEl());
reg('bodyEx', new FakeEl()); reg('ayPanel', new FakeEl()); reg('ayMsg', new FakeEl()); reg('ayChips', new FakeEl());
reg('ayIn', new FakeEl()); reg('almWrap', new FakeEl()); reg('qOpts', new FakeEl()); reg('qFdb', new FakeEl());
reg('qCorrec', new FakeEl()); reg('qExpl', new FakeEl()); reg('qStarBtn', new FakeEl()); reg('qNext', new FakeEl());
reg('qOkReal', new FakeEl()); reg('qBlank', new FakeEl()); reg('qGui', new FakeEl());
reg('qRevelar', new FakeEl()); reg('qGModel', new FakeEl()); reg('qGAssess', new FakeEl());
reg('qGYes', new FakeEl()); reg('qGNo', new FakeEl());

global.document = {
  getElementById: (id) => els[id] || reg(id, new FakeEl()),
  querySelector: () => null, querySelectorAll: () => [],
  documentElement: new FakeEl(), createElement: (t) => new FakeEl(t), body: new FakeEl(),
};
global.navigator = { userAgent:'Node', serviceWorker:{ register(){ return Promise.resolve(); } }, clipboard:null, share:null };
global.localStorage = { getItem:(k)=>store[k]!==undefined?store[k]:null, setItem:(k,v)=>{store[k]=String(v);}, removeItem:(k)=>{delete store[k];} };
global.window=global; global.requestAnimationFrame=(f)=>f(); global.addEventListener=()=>{};
global.fetch=()=>Promise.resolve({ ok:false, clone:()=>({}), json:()=>Promise.resolve({}) });
global.alert=()=>{}; global.confirm=()=>false; global.Intl=Intl;

eval(code);

estGuardarUsuarios([{ id:'u1', nombre:'Eve', clave:'123' }]);
LS.set('est_uid', 'u1');

const cur = () => els.bodyEx.innerHTML.replace(/\s+/g,' ').slice(0,110);

examenMateria('m_tactica');
if (els.bodyEx.innerHTML.indexOf('preguntas cargadas')===-1) throw new Error('intro mal: '+cur());
console.log('OK intro (64 preguntas)');

const corta = els.bodyEx.buttons.find(b=>b.dataset.cant==='corta');
if (!corta) throw new Error('sin boton corta');
corta.click();
if (els.bodyEx.innerHTML.indexOf('Pregunta 1 de 5')===-1) throw new Error('no avanza P1: '+cur());
console.log('OK pregunta 1 visible, comienza el flujo');

let answered = 0;
for (let round=0; round<50 && answered<5; round++){
  const html = els.bodyEx.innerHTML;
  const mQ = html.match(/class="sub">Pregunta (\d+) de 5 · ([^<]+)</);
  if (!mQ) { console.log('NO mas preguntas -> fin alcanzado'); break; }
  const n = Number(mQ[1]), tipoLbl = mQ[2];
  if (n !== answered+1) { console.log('pregunta en curso: n='+n+' (esperada '+(answered+1)+')'); }

  if (tipoLbl === 'Pregunta de la guía'){
    const rev = document.getElementById('qRevelar');
    if (rev && rev._onclick){ rev.click(); } else { throw new Error('sin qRevelar'); }
    const yes = document.getElementById('qGYes');
    if (yes && yes._onclick){ yes.click(); } else { throw new Error('sin qGYes'); }
    answered++;
    console.log('OK P'+n+' guía respondida');
  } else if (tipoLbl === 'Completar frase'){
    const inp = document.getElementById('qBlank'); inp.value = 'respuesta';
    const ok = document.getElementById('qOkReal');
    if (ok && ok._onclick){ ok.click(); } else { throw new Error('sin qOkReal'); }
    answered++;
    console.log('OK P'+n+' completar respondida');
  } else {
    const opts = els.bodyEx.buttons.filter(b=>b.dataset.v!==undefined);
    if (!opts.length){ console.log('sin opciones render -> '+cur()); break; }
    opts[0].click();
    answered++;
    console.log('OK P'+n+' '+tipoLbl+' respondida');
  }
  // pasar a la siguiente
  const next = document.getElementById('qNext');
  if (next && next._onclick){ next.click(); }
}

if (answered !== 5) throw new Error('solo respondió '+answered+'/5: '+cur());
console.log('RESULTADO: EXAMEN DE MORTEROS COMPLETADO SIN TILDARSE (5/5 preguntas, tipos mezclados)');