const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),ctx={};vm.createContext(ctx);let a=html.indexOf('var CONTENIDO = {');vm.runInContext(html.slice(a,html.indexOf('\n};',a)+3),ctx);
for(const [name,id] of [['logistica','log_villar'],['historia','hist_repaso']]){
 const rows=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',name+'-transcripcion.json'),'utf8')).filter(Array.isArray),t=ctx.CONTENIDO.temas.find(t=>t.id===id);
 assert.equal(t.preguntas.length,rows.length+(id==='hist_repaso'?10:0));assert.equal(t.conceptos.length,rows.length);assert.equal(t.secciones.length,rows.length+1+(id==='hist_repaso'?1:0));
 rows.forEach((r,i)=>{const prompt=r[0][0],answer=r[1][0].replace(/^Respuesta: /,'');assert.equal(t.secciones[i+1].titulo,prompt);assert.equal(t.secciones[i+1].parrafos[0],answer);assert.equal(t.conceptos[i].t,prompt);assert.equal(t.conceptos[i].d,answer);const q=t.preguntas[i];assert.equal(q.p,prompt);assert.equal(q.o[q.c],answer);assert.equal(q.tipo,'mc');assert.equal(q.o.length,4);assert.equal(new Set(q.o).size,4);});
}
console.log('PASS: exact new DOCX transcript questions and answers in reading, cards and exams');
