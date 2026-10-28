const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const script=fs.readFileSync(path.resolve(__dirname,'../pjt.js'),'utf8');
const disk=new Map(),listeners={};let active='a',fail=false;
const ctx={console,Blob,URL,setTimeout,clearTimeout,Date,document:{getElementById:()=>null,querySelectorAll:()=>[]},
  window:{addEventListener:(type,fn)=>listeners[type]=fn},estUid:()=>active,
  localStorage:{getItem:key=>disk.get(key)||null,setItem:(key,value)=>{if(fail)throw new Error('quota');disk.set(key,value);},removeItem:key=>disk.delete(key)}};
vm.createContext(ctx);vm.runInContext(script,ctx);
const a=ctx.pjtGetDraft('a');a.fields.m_quien='Nota A';a.changed.m_quien=true;
assert(ctx.pjtPersist('a'));const key=ctx.pjtStorageKey('a');
// Another tab changes a different field after this tab read the draft.
disk.set(key,JSON.stringify({version:1,fields:{m_quien:'Nota A',m_donde:'Cambio de otra pestaña'},updated:new Date().toISOString()}));
a.fields.m_que='Edición actual';a.changed.m_que=true;assert(ctx.pjtPersist('a'));
const merged=JSON.parse(disk.get(key));assert.equal(merged.fields.m_donde,'Cambio de otra pestaña');assert.equal(merged.fields.m_que,'Edición actual');
const previous=disk.get(key);fail=true;a.fields.m_fin='Pendiente';a.changed.m_fin=true;a.dirty=true;
assert.equal(ctx.pjtPersist('a'),false);assert.equal(disk.get(key),previous);assert.equal(a.fields.m_fin,'Pendiente');assert.equal(a.dirty,true);
// A failed save in A must still warn at unload after the user enters profile B.
active='b';ctx.pjtGetDraft('b');let warned=false;listeners.beforeunload({preventDefault(){warned=true;},returnValue:undefined});assert(warned);
fail=false;assert(ctx.pjtPersist('a'));warned=false;listeners.beforeunload({preventDefault(){warned=true;}});assert.equal(warned,false);
console.log('PASS: PJT merges independent tab edits, preserves failed writes and warns across profile switches');
