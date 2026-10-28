/* Auxiliar de consulta PJT. Las notas son texto local del usuario. */
'use strict';
var PJT = {
  "version": "pjt-20261028",
  "resources": [
    {
      "url": "./materiales/pjt/manual.pdf",
      "title": "Reglamento MOP-00-02 · 2023",
      "type": "document"
    },
    {
      "url": "./materiales/pjt/presentacion.pdf",
      "title": "Presentación de apoyo · 15 páginas",
      "type": "document"
    },
    {
      "url": "./materiales/pjt/guia.docx",
      "title": "Guía de estudio en Word",
      "type": "document"
    },
    {
      "url": "./materiales/pjt/lamina-acronimos.webp",
      "title": "Acrónimos y reglas mnemotécnicas",
      "type": "image",
      "note": "Referencia de apoyo. Contrastá cada regla con el Anexo 1 del manual."
    },
    {
      "url": "./materiales/pjt/lamina-orden.webp",
      "title": "Guía de orden de operaciones",
      "type": "image",
      "note": "Esta lámina agrega una F de determinación de modos de acción. En la secuencia RIAFECIS del manual, F corresponde a formulación y el total es ocho pasos."
    },
    {
      "url": "./materiales/pjt/lamina-planeamiento.webp",
      "title": "Guía de planeamiento",
      "type": "image",
      "note": "La lámina repite el paso E5. El reconocimiento es el paso 5 y aparece una sola vez en la secuencia oficial de ocho pasos."
    },
    {
      "url": "./materiales/pjt/lamina-procedimiento.webp",
      "title": "Guía de procedimiento",
      "type": "image",
      "note": "La lámina presenta pasos duplicados o mal numerados en el recorrido. Consultá la secuencia de ocho pasos en la guía principal y en Cap. I-1."
    },
    {
      "url": "./materiales/pjt/lamina-tipos.webp",
      "title": "Tipos de órdenes",
      "type": "image",
      "note": "Apoyo visual. La estructura de la orden se consulta en el Anexo 3 del manual."
    },
    {
      "url": "./materiales/pjt/video-regla.mp4",
      "title": "La regla del tercio",
      "type": "video"
    },
    {
      "url": "./materiales/pjt/video-planeamiento.mp4",
      "title": "El planeamiento y el tiempo disponible",
      "type": "video"
    },
    {
      "url": "./materiales/pjt/video-orden.mp4",
      "title": "Cómo redactar una orden de operaciones",
      "type": "video"
    }
  ]
};
var pjtDrafts = Object.create(null), pjtCurrentPage = 'inicio', pjtOfflineTicket = 0;
var pjtFields = [
  ['m_superior','Misión del escalón superior','Copiá el texto que te entregaron; conservá su procedencia.'],
  ['m_particular','Misión particular asignada a tu elemento','Transcribí la misión recibida, sin sustituirla por una lista de actividades.'],
  ['m_quien','Quién','Elemento al que se refiere el enunciado.'],
  ['m_que','Qué','Acción indicada en la misión recibida.'],
  ['m_cuando','Cuándo','Oportunidad o condición temporal expresada en la fuente.'],
  ['m_donde','Dónde','Lugar o ámbito expresado en la fuente.'],
  ['m_para','Para qué · tarea','Identificá la tarea tal como fue impartida.'],
  ['m_fin','A fin de · propósito','Identificá el propósito tal como fue impartido.'],
  ['m_dudas','Dudas para consultar','Anotá qué falta aclarar con el docente o con quien impartió la misión.'],
  ['o_situacion','1. Situación','Apuntes propios bajo este título.'],
  ['o_mision','2. Misión','Texto de la misión recibida.'],
  ['o_ejecucion','3. Ejecución','Apuntes propios bajo este título.'],
  ['o_logistica','4. Logística','Apuntes propios bajo este título.'],
  ['o_comando','5. Comando y comunicaciones','Apuntes propios bajo este título.'],
  ['n_libres','Mis notas de consulta','Guardá tus observaciones o preguntas sobre el material.']
];
var pjtSteps = [
  ['Recepción de la orden','La secuencia comienza con la orden del escalón superior. El manual distingue recepción de una orden preparatoria y recepción de una orden de operaciones.','Cap. I-2 a I-4',12],
  ['Impartición de la orden preparatoria','Su finalidad es ganar tiempo para la preparación de la fracción. Su contenido se desarrolla en el punto 1.004 del manual.','Cap. I-4 · 1.004',14],
  ['Apreciación de situación','Se organiza mediante METT-C: misión, enemigo, terreno y condiciones meteorológicas, tropas disponibles y consideraciones civiles. El análisis de la misión identifica seis interrogantes.','Cap. I-5 a I-7 · 1.005',15],
  ['Formulación del plan tentativo','El cuarto paso trata la formulación del plan tentativo. Para consultar su desarrollo y la resolución, abrí el punto 1.006 del manual.','Cap. I-7 a I-8 · 1.006',17],
  ['Ejecución de reconocimientos','Se contrasta en el terreno lo analizado previamente en la carta. El reconocimiento y el completamiento del planeamiento se relacionan entre sí.','Cap. I-8 · 1.007',18],
  ['Completamiento del planeamiento','Se actualiza lo planificado según lo comprobado. No es un paso duplicado de la formulación del plan.','Cap. I-8 · 1.008',18],
  ['Impartición de la orden de operaciones','La estructura se consulta en el Anexo 3. En los menores niveles, el manual prevé impartición verbal apoyada en notas y ayudas visuales.','Cap. I-8 · Anexo 3',18],
  ['Supervisión','Incluye el control del desarrollo y, cuando corresponda, los ensayos. El Anexo 4 describe las técnicas de ensayo.','Cap. I-8 · 1.010 · Anexo 4',18]
];
function pjtEscape(s){ return String(s == null ? '' : s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function pjtSource(label,page){ return '<a class="pjt-source" href="./materiales/pjt/manual.pdf#page='+page+'" target="_blank" rel="noopener">MOP-00-02 (2023) · '+pjtEscape(label)+' · abrir fuente</a>'; }
function pjtStorageKey(uid){ return 'est_u'+uid+'_pjt_notas_v1'; }
function pjtGetDraft(uid){
  if(pjtDrafts[uid]) return pjtDrafts[uid];
  var draft={version:1,fields:{},changed:{},updated:'',error:'',dirty:false};
  try{var raw=localStorage.getItem(pjtStorageKey(uid)),data=raw?JSON.parse(raw):null;
    if(data&&data.version===1&&data.fields&&typeof data.fields==='object'){
      pjtFields.forEach(function(f){if(typeof data.fields[f[0]]==='string')draft.fields[f[0]]=data.fields[f[0]].slice(0,10000);});
      if(typeof data.updated==='string')draft.updated=data.updated;
    }
  }catch(e){draft.error='No se pudo leer el borrador guardado. Exportá tus notas antes de cerrar.';}
  pjtDrafts[uid]=draft;return draft;
}
function pjtPersist(uid){
  var d=pjtGetDraft(uid);
  try{
    var existing=localStorage.getItem(pjtStorageKey(uid)),latest=existing?JSON.parse(existing):null,merged={};
    pjtFields.forEach(function(f){var id=f[0];if(latest&&latest.version===1&&latest.fields&&typeof latest.fields[id]==='string')merged[id]=latest.fields[id];if(d.changed[id])merged[id]=d.fields[id]||'';});
    var raw=JSON.stringify({version:1,fields:merged,updated:new Date().toISOString()});
    localStorage.setItem(pjtStorageKey(uid),raw);if(localStorage.getItem(pjtStorageKey(uid))!==raw)throw new Error('write');d.fields=merged;d.changed={};d.updated=JSON.parse(raw).updated;d.dirty=false;d.error='';
  }
  catch(e){d.error='No se pudo guardar en este dispositivo. Conservá esta pantalla y descargá tus notas antes de cerrar.';d.dirty=true;}
  pjtShowSave();return !d.dirty;
}
function pjtShowSave(){
  var status=document.getElementById('pjtSaveStatus'),uid=estUid();if(!status||!uid)return;
  var d=pjtGetDraft(uid);status.dataset.error=d.error?'true':'false';
  status.textContent=d.error||(d.updated?'Guardado en este dispositivo · '+new Date(d.updated).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):'Se guarda automáticamente al escribir, en este perfil y navegador.');
}
function pjtFieldHtml(id){
  var f=pjtFields.find(function(x){return x[0]===id;});
  return '<label class="pjt-field" for="pjt-'+id+'"><span>'+pjtEscape(f[1])+'</span><small id="pjt-help-'+id+'">'+pjtEscape(f[2])+'</small><textarea id="pjt-'+id+'" data-pjt-field="'+id+'" aria-describedby="pjt-help-'+id+'" maxlength="10000"'+(id.indexOf('o_')===0?' data-large="true"':'')+'></textarea></label>';
}
function pjtBindFields(){
  var uid=estUid(),draft=pjtGetDraft(uid);
  document.querySelectorAll('[data-pjt-field]').forEach(function(el){
    var id=el.dataset.pjtField;el.value=draft.fields[id]||'';
    el.addEventListener('input',function(){
      if(estUid()!==uid)return;
      draft.fields[id]=el.value;draft.changed[id]=true;draft.dirty=true;pjtPersist(uid);
      var output=document.getElementById('pjtNotesOutput');if(output)output.textContent=pjtNotesText();
    });
  });pjtShowSave();
}
function pjtNotesActions(review){
  return '<p class="pjt-save" id="pjtSaveStatus" role="status" aria-live="polite"></p><div class="pjt-actions">'+
    (review?'<button class="bigbtn" id="pjtReview" type="button" onclick="pjtReview()">Comprobar campos</button>':'')+
    '<button class="bigbtn ghost" type="button" onclick="pjtDownloadNotes()">Descargar mis notas</button><button class="bigbtn ghost" type="button" onclick="pjtCopyNotes()">Copiar mis notas</button></div><p id="pjtCopyStatus" role="status" class="note"></p><div id="pjtReviewResult" class="pjt-review" role="status" hidden></div>';
}
function pjtHomeHtml(){
  var cards=[['pasos','¿Qué pasos tiene el PJT?','La secuencia RIAFECIS y sus referencias en el manual.'],['mision','Entender la misión recibida','Seis interrogantes, tarea, propósito y relación con el escalón superior.'],['orden','Consultar una orden de operaciones','Los cinco párrafos y un espacio de notas con esos títulos.'],['recursos','Ver el material de apoyo','Reglamento, guía, presentación, láminas ampliables y videos.'],['notas','Volver a mis notas','Recuperar y descargar lo que anotaste en este dispositivo.']];
  return '<div class="pjt-grid">'+cards.map(function(c){return '<button class="pjt-tile" data-pjt-go="'+c[0]+'" type="button" onclick="pjtOpen(\''+c[0]+'\')"><b>'+c[1]+'</b><span>'+c[2]+'</span></button>';}).join('')+'</div><div class="pjt-callout"><b>Consulta rápida</b><p>Elegí lo que necesitás consultar. Los campos de notas empiezan vacíos y conservan lo que escribís. Las fuentes y los ejemplos académicos se distinguen de tus apuntes.</p></div>';
}
function pjtStepsHtml(){
  return '<h3>Los ocho pasos · RIAFECIS</h3><p>AROIS resume las cinco tareas fundamentales. RIAFECIS identifica la secuencia completa de ocho pasos; el manual señala que el método es flexible.</p>'+pjtSource('Cap. I-1 · 1.001',11)+pjtSteps.map(function(s,i){return '<details><summary>'+(i+1)+'. '+s[0]+'</summary><p>'+s[1]+'</p>'+pjtSource(s[2],s[3])+'</details>';}).join('')+'<div class="pjt-callout"><b>Referencia sobre el tiempo</b><p>El manual establece un máximo de un tercio del tiempo disponible para el planeamiento propio y al menos dos tercios para los subordinados. HH indica inicio de la operación y HCM, hora de cumplimiento de la misión.</p>'+pjtSource('Cap. I-2 · 1.002',12)+'</div>';
}
function pjtMissionHtml(){
  return '<h3>Entender la misión recibida</h3><p>La puntualización responde a <b>quién, qué, cuándo, dónde, para qué y a fin de</b>. En este manual, el <b>para qué</b> identifica la tarea y el <b>a fin de</b>, el propósito.</p>'+pjtSource('Cap. I-5 · 1.005 a.1',15)+
    '<details open><summary>¿Cómo se relaciona con el escalón superior?</summary><p>El manual indica que el <b>para qué del superior podrá ser el a fin de propio</b>, y agrega que esto debe estar claramente ordenado. No es una sustitución automática entre frases.</p><div class="pjt-compare"><div><b>Escalón superior</b><p>Identificar su tarea y su propósito en la orden recibida.</p></div><div><b>Propio nivel</b><p>Identificar la misión particular asignada al propio elemento y el propósito que le fue impartido.</p></div></div><p>Si falta la tarea o el propósito, anotá la duda para consultarla. El Anexo 3 señala que la misión particular procede de la orden del superior y que, al impartirla, se expresa textualmente la misión recibida.</p>'+pjtSource('Cap. I-3 · 1.003 c',13)+pjtSource('Anexo 3-3',31)+pjtSource('Anexo 3-9',37)+'</details>'+
    '<details><summary>Ejemplo de redacción de una actividad de aula</summary><p><b>Ejemplo académico:</b> El equipo de biblioteca organizará los ejemplares el lunes, en el aula 2, para dejar completo el material de consulta, a fin de facilitar la actividad de lectura del curso.</p><p>Quién: equipo de biblioteca. Qué: organizar los ejemplares. Cuándo: lunes. Dónde: aula 2. Para qué: dejar completo el material de consulta. A fin de: facilitar la actividad de lectura.</p><p>Este ejemplo explica la estructura gramatical; no reemplaza la misión asignada en una consigna.</p></details>'+
    '<div class="card"><h3>Mis apuntes sobre la misión</h3><p class="note">Separá el texto recibido de tu identificación de los interrogantes. Se guarda en este perfil y navegador; no se sincroniza entre dispositivos.</p>'+['m_superior','m_particular','m_quien','m_que','m_cuando','m_donde','m_para','m_fin','m_dudas'].map(pjtFieldHtml).join('')+pjtNotesActions(true)+'</div>';
}
function pjtOrderHtml(){
  var parts=[['Situación','Terreno y condiciones meteorológicas, fuerzas enemigas, fuerzas amigas y elementos agregados o destacados.'],['Misión','Enunciado de la misión recibida, con los interrogantes básicos.'],['Ejecución','Concepto de la operación, maniobra y apoyos, misiones particulares e instrucciones de coordinación.'],['Logística','Apartado destinado al sostén logístico de la fracción.'],['Comando y comunicaciones','Apartados de comando y de comunicaciones.']];
  return '<h3>Los cinco párrafos de la orden de operaciones</h3><p>Este esquema sirve para ubicar cada apartado al consultar la orden. El desarrollo completo y las ayudas para su impartición están en el Anexo 3.</p>'+pjtSource('Anexo 3-1 a 3-2',29)+parts.map(function(p,i){return '<details><summary>'+(i+1)+'. '+p[0]+'</summary><p>'+p[1]+'</p></details>';}).join('')+
    '<details><summary>¿Qué tipo de orden estoy consultando?</summary><p><b>Preparatoria:</b> adelanta información para ganar tiempo. <b>De operaciones:</b> determina la ejecución de una operación y emplea los cinco párrafos. <b>Parcial:</b> introduce modificaciones. <b>Tipo misión:</b> el manual la menciona especialmente al conducir con poco tiempo disponible.</p>'+pjtSource('Cap. I-2, I-4 e I-8',12)+'</details><div class="card"><h3>Mis notas por apartado</h3><p class="note">Los títulos organizan únicamente el texto que vos escribís.</p>'+['o_situacion','o_mision','o_ejecucion','o_logistica','o_comando'].map(pjtFieldHtml).join('')+pjtNotesActions(true)+'</div>';
}
function pjtResourcesHtml(){
  var docs=PJT.resources.filter(function(r){return r.type==='document';}),images=PJT.resources.filter(function(r){return r.type==='image';}),videos=PJT.resources.filter(function(r){return r.type==='video';});
  return '<h3>Material de consulta</h3><p>El MOP-00-02 es la referencia para el texto de la guía. Las láminas, la presentación y los videos son apoyos de estudio.</p><div class="pjt-actions">'+docs.map(function(r){return '<div><a class="pjt-link" href="'+r.url+'" target="_blank" rel="noopener">'+pjtEscape(r.title)+'</a><a class="pjt-link" href="'+r.url+'" download>Descargar '+pjtEscape(r.title)+'</a></div>';}).join('')+'</div><p class="note">En la página 8 de la presentación se repite el cuadro de terreno. METT-C tiene cinco factores; la referencia de la guía principal está verificada con el manual.</p><h3>Láminas · tocá para ampliar</h3><div class="pjt-grid">'+images.map(function(r,i){return '<figure><button data-pjt-zoom="'+i+'" type="button" aria-label="Ampliar '+pjtEscape(r.title)+'" onclick="pjtZoom('+i+',this)"><img loading="lazy" src="'+r.url+'" alt="'+pjtEscape(r.title)+'"></button><figcaption><b>'+pjtEscape(r.title)+'</b>'+(r.note?'<br>'+pjtEscape(r.note):'')+'</figcaption></figure>';}).join('')+'</div><h3>Videos de apoyo</h3><p class="note">Se descargan con el módulo para poder reproducirlos sin conexión. Contrastá las explicaciones con el manual.</p>'+videos.map(function(r){return '<section class="pjt-video"><h3>'+pjtEscape(r.title)+'</h3><video controls playsinline preload="metadata" aria-label="'+pjtEscape(r.title)+'"><source src="'+r.url+'" type="video/mp4">Tu navegador no puede reproducir este video.</video><a class="pjt-link" href="'+r.url+'" download>Descargar video</a></section>';}).join('');
}
function pjtNotesHtml(){
  return '<h3>Mis notas</h3><p>Se conservan en este perfil y navegador. Descargar una copia permite llevarlas a otro dispositivo.</p>'+pjtFieldHtml('n_libres')+pjtNotesActions(false)+'<h3>Contenido guardado</h3><pre id="pjtNotesOutput" class="pjt-notes-output"></pre><button class="bigbtn ghost" type="button" onclick="pjtClearNotes()">Borrar mis notas de PJT</button>';
}
function pjtOpen(page){
  if(!estUsuario()){pintarLogin();return;}
  var allowed=['inicio','pasos','mision','orden','recursos','notas'];if(allowed.indexOf(page)<0)page='inicio';
  pjtCurrentPage=page;curMateria='m_pjt';document.getElementById('hdTitle').textContent='Proceder del Jefe de Tropas';
  var titles={inicio:'Ayuda práctica',pasos:'Pasos del PJT',mision:'Misión',orden:'Orden de operaciones',recursos:'Material de apoyo',notas:'Mis notas'};
  var content=page==='inicio'?pjtHomeHtml():page==='pasos'?pjtStepsHtml():page==='mision'?pjtMissionHtml():page==='orden'?pjtOrderHtml():page==='recursos'?pjtResourcesHtml():pjtNotesHtml();
  document.getElementById('view').innerHTML='<section id="pjtRoot" class="pjt" data-page="'+page+'"><div class="row"><button id="pjtBack" class="bigbtn ghost" type="button" onclick="pjtBack()">← '+(page==='inicio'?'Materias':'Ayuda práctica')+'</button></div><header class="card pjt-header"><span class="pjt-kicker">Proceder del Jefe de Tropas</span><h2>'+titles[page]+'</h2><p>Consulta y notas · MOP-00-02 (2023)</p><div id="pjtOffline" class="pjt-offline" role="status" aria-live="polite">Preparando la comprobación sin conexión…</div><button class="bigbtn ghost" type="button" onclick="pjtCheckOffline()">Comprobar descarga</button></header>'+
    (page!=='inicio'?'<nav class="pjt-nav" aria-label="Consulta PJT">'+allowed.map(function(k){return '<button class="bigbtn '+(k===page?'':'ghost')+'" data-pjt-go="'+k+'" type="button" aria-current="'+(k===page?'page':'false')+'" onclick="pjtOpen(\''+k+'\')">'+titles[k]+'</button>';}).join('')+'</nav>':'')+content+'</section>';
  pjtBindFields();var output=document.getElementById('pjtNotesOutput');if(output)output.textContent=pjtNotesText();
  pjtCheckOffline();window.scrollTo(0,0);
}
function pjtBack(){if(pjtCurrentPage!=='inicio')pjtOpen('inicio');else home();}
function pjtReview(){
  var ids=pjtCurrentPage==='mision'?['m_quien','m_que','m_cuando','m_donde','m_para','m_fin']:['o_situacion','o_mision','o_ejecucion','o_logistica','o_comando'];
  var d=pjtGetDraft(estUid()),missing=ids.filter(function(id){return !(d.fields[id]||'').trim();}),el=document.getElementById('pjtReviewResult');
  el.hidden=false;el.textContent=(missing.length?'Faltan campos: '+missing.map(function(id){return pjtFields.find(function(f){return f[0]===id;})[1];}).join(', ')+'.':'Los '+ids.length+' campos contienen texto.')+' Esta comprobación solo indica presencia de texto; no evalúa su contenido ni la relación entre las misiones.';
}
function pjtNotesText(){
  var d=pjtGetDraft(estUid()),out=['MIS NOTAS DE CONSULTA PJT',''];pjtFields.forEach(function(f){if((d.fields[f[0]]||'').trim())out.push(f[1],d.fields[f[0]],'');});
  if(out.length===2)out.push('Todavía no escribiste notas.');return out.join('\n');
}
function pjtDownloadNotes(){
  var blob=new Blob(['\ufeff'+pjtNotesText()],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='Mis_notas_PJT.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
async function pjtCopyNotes(){
  var el=document.getElementById('pjtCopyStatus');
  try{await navigator.clipboard.writeText(pjtNotesText());el.textContent='Notas copiadas.';}catch(e){el.textContent='No se pudo acceder al portapapeles. Usá Descargar mis notas.';}
}
function pjtClearNotes(){
  if(!confirm('¿Borrar solo tus notas de PJT en este dispositivo?'))return;
  var uid=estUid();try{localStorage.removeItem(pjtStorageKey(uid));if(localStorage.getItem(pjtStorageKey(uid))!==null)throw new Error('delete');delete pjtDrafts[uid];pjtOpen('notas');}
  catch(e){var el=document.getElementById('pjtSaveStatus');el.dataset.error='true';el.textContent='No se pudo borrar el borrador.';}
}
function pjtDeleteForUser(uid){try{localStorage.removeItem(pjtStorageKey(uid));delete pjtDrafts[uid];}catch(e){/* conserva el estado si el navegador no permite borrarlo */}}
function pjtZoom(index,trigger){
  var r=PJT.resources.filter(function(x){return x.type==='image';})[index];if(!r)return;
  var dlg=document.getElementById('pjtImageDialog');if(!dlg){dlg=document.createElement('dialog');dlg.id='pjtImageDialog';dlg.setAttribute('aria-label','Lámina ampliada');dlg.innerHTML='<div class="pjt-image-toolbar"><b id="pjtImageTitle"></b><button class="bigbtn ghost" type="button" id="pjtImageScale">Ampliar más</button><button class="bigbtn" type="button" id="pjtImageClose">Cerrar</button></div><div class="pjt-image-scroll"><img id="pjtLargeImage" alt=""></div>';document.body.appendChild(dlg);
    document.getElementById('pjtImageClose').onclick=function(){dlg.close();};document.getElementById('pjtImageScale').onclick=function(){var large=document.getElementById('pjtLargeImage');large.classList.toggle('pjt-natural');this.textContent=large.classList.contains('pjt-natural')?'Ajustar imagen':'Ampliar más';};
    dlg.addEventListener('close',function(){if(dlg._trigger&&dlg._trigger.isConnected)dlg._trigger.focus();});
  }
  dlg._trigger=trigger;document.getElementById('pjtImageTitle').textContent=r.title;var img=document.getElementById('pjtLargeImage');img.className='';img.src=r.url;img.alt=r.title;document.getElementById('pjtImageScale').textContent='Ampliar más';dlg.showModal();
}
async function pjtCheckOffline(){
  var ticket=++pjtOfflineTicket,el=document.getElementById('pjtOffline');if(!el)return;
  el.dataset.ready='false';el.textContent='Preparando la comprobación sin conexión…';
  try{
    if(!('serviceWorker' in navigator))throw new Error('unavailable');
    var reg=await Promise.race([navigator.serviceWorker.ready,new Promise(function(_,reject){setTimeout(function(){reject(new Error('timeout'));},12000);})]);
    var worker=reg.active;if(!worker)throw new Error('inactive');
    var result=await new Promise(function(resolve,reject){var channel=new MessageChannel(),timer=setTimeout(function(){channel.port1.close();reject(new Error('timeout'));},8000);channel.port1.onmessage=function(ev){clearTimeout(timer);channel.port1.close();resolve(ev.data);};worker.postMessage({type:'PJT_OFFLINE_STATUS'},[channel.port2]);});
    if(ticket!==pjtOfflineTicket||!el.isConnected)return;
    if(!result||result.pjtVersion!==PJT.version||!result.ready)throw new Error('incomplete');
    el.dataset.ready='true';el.textContent='Disponible sin conexión · guía, láminas, documentos y videos descargados.';
  }catch(e){if(ticket===pjtOfflineTicket&&el.isConnected)el.textContent='Descarga todavía incompleta. Con conexión, dejá terminar la actualización y volvé a comprobar.';}
}
window.addEventListener('online',function(){if(document.getElementById('pjtRoot'))pjtCheckOffline();});
window.addEventListener('beforeunload',function(e){if(Object.keys(pjtDrafts).some(function(uid){return pjtDrafts[uid].dirty;})){e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',function(e){
  var uid=typeof estUid==='function'?estUid():'';
  if(!uid||e.key!==pjtStorageKey(uid)||!pjtDrafts[uid])return;
  var draft=pjtDrafts[uid];
  try{var latest=e.newValue?JSON.parse(e.newValue):null;if(latest&&latest.version!==1)return;
    pjtFields.forEach(function(f){var id=f[0];if(!draft.changed[id])draft.fields[id]=latest&&latest.fields&&typeof latest.fields[id]==='string'?latest.fields[id]:'';});
    if(!draft.dirty)draft.updated=latest?latest.updated:'';
    document.querySelectorAll('[data-pjt-field]').forEach(function(el){if(document.activeElement!==el)el.value=draft.fields[el.dataset.pjtField]||'';});
    var output=document.getElementById('pjtNotesOutput');if(output)output.textContent=pjtNotesText();pjtShowSave();
  }catch(error){/* conserva las notas locales si el otro documento contiene datos no válidos */}
});
