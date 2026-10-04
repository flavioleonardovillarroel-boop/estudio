const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8'),ctx={};
vm.createContext(ctx);
const start=html.indexOf('var CONTENIDO = {');
vm.runInContext(html.slice(start,html.indexOf('\n};',start)+3),ctx);
vm.runInContext(html.slice(html.indexOf('function opcionCanonica(q){'),html.indexOf('function quiz(t, body){')),ctx);
let count=0;
for(const tema of ctx.CONTENIDO.temas)for(const original of tema.preguntas){
  const snapshot=JSON.stringify(original),q=ctx.preguntaSeleccion(original,tema.preguntas);
  assert(!q.tipo||q.tipo==='mc');assert.equal(q.o.length,4);
  assert.equal(new Set(q.o.map(ctx.normalizarOpcion)).size,4);
  assert.equal(q.o[q.c],ctx.opcionCanonica(original));
  assert.equal(q.p,original.p);assert.equal(JSON.stringify(original),snapshot);
  if(original.tipo&&original.tipo!=='mc'&&!ctx.opcionesAlternativas(original,ctx.opcionCanonica(original)))for(let i=0;i<4;i++)if(i!==q.c)assert(!ctx.parecidas(q.o[q.c],q.o[i]),original.p);
  if(original.tipo==='vf')assert(q.enunciadoSeleccion.includes('evaluación y explicación'));
  count++;
}
assert(ctx.parecidas('comando','El comando.'));
assert(html.includes("+ (q.enunciadoSeleccion || q.p) + '</h2>'"));
assert.equal(count,912);
console.log('PASS: 912 questions, four distinct choices, canonical correct answers, synonym filtering and stable progress IDs');
