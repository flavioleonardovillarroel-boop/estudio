const assert=require('assert/strict'),fs=require('fs'),path=require('path'),os=require('os');
const {pwaResources}=require('./helpers/pwa-resources.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'estudio-pwa-resources-'));
const rootResolved=path.resolve(root);
function fixture(entries){fs.writeFileSync(path.join(root,'sw.js'),"const CACHE='estudio-v1'; const PRECACHE="+JSON.stringify(entries)+';');}
try{
 fs.writeFileSync(path.join(root,'index.html'),'app');
 fs.writeFileSync(path.join(root,'Guia.docx'),'test guide');
 fixture(['./','./index.html','./Guia.docx']);
 const before=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const good=pwaResources(root);
 assert(good.files.has('Guia.docx'));assert.equal(good.entry,'index.html');assert.equal(good.cache,'estudio-v1');assert(good.mimeFor('Guia.docx').includes('wordprocessingml'));
 assert.equal(fs.readFileSync(path.join(root,'sw.js'),'utf8'),before,'Resource inspection must not edit files');
 fixture(['./','./guia.docx']);assert.throws(()=>pwaResources(root),/mayúsculas/);
 fixture(['./','./missing.docx']);assert.throws(()=>pwaResources(root),/ausente/);
 for(const unsafe of ['./../private.docx','./%2e%2e/private.docx','https://example.com/a','/Guia.docx','./%2fGuia.docx']){fixture(['./',unsafe]);assert.throws(()=>pwaResources(root));}
 fixture(['./','./Guia.docx']);const resources=pwaResources(root);assert.throws(()=>resources.pathFor('.git/config'),/no permitido/);
 fixture(['./Guia.docx']);const incomplete=pwaResources(root);assert(incomplete.files.has('index.html'));assert(!incomplete.cachedFiles.has('index.html'),'A served entry must not be reported as precached when omitted from PRECACHE');
 fs.writeFileSync(path.join(root,'Guía.docx'),'accented filename');fixture(['./','./Gu%C3%ADa.docx']);const encoded=pwaResources(root);assert(encoded.cachedFiles.has('Guía.docx'));assert.equal(encoded.resolveRequest('Gu%C3%ADa.docx'),'Guía.docx');assert.equal(encoded.resolveRequest('Guía.docx'),'Guía.docx');
 for(const unsafe of ['%','%2e%2e/private.docx','%2fGuía.docx','%5cGuía.docx','.git/config'])assert.equal(encoded.resolveRequest(unsafe),null);
 fs.mkdirSync(path.join(root,'materiales'));fs.writeFileSync(path.join(root,'materiales/nuevo.docx'),'new');fixture(['./','./materiales/nuevo.docx']);assert(pwaResources(root).files.has('materiales/nuevo.docx'),'New precache resources must be served without editing a hard-coded list');
 console.log('PASS: automatic resource list, Word MIME, read-only inspection, case sensitivity, missing files and traversal rejection');
}finally{
 if(rootResolved!==root||!path.basename(rootResolved).startsWith('estudio-pwa-resources-')||path.dirname(rootResolved)!==path.resolve(os.tmpdir()))throw new Error('Unexpected temporary directory; refusing cleanup');
 fs.rmSync(rootResolved,{recursive:true,force:true});
}
