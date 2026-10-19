const fs=require('fs'),path=require('path'),vm=require('vm');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf'};

function exactFile(root,relative){
  const parts=relative.split('/');let current=root;
  for(const part of parts){
    if(!part||part==='.'||part==='..')throw new Error('Ruta de recurso no permitida: '+relative);
    if(!fs.readdirSync(current).includes(part))throw new Error('Recurso ausente o mayúsculas incorrectas: '+relative);
    current=path.join(current,part);
    if(fs.lstatSync(current).isSymbolicLink())throw new Error('No se permiten enlaces simbólicos en el precache: '+relative);
  }
  if(!fs.statSync(current).isFile())throw new Error('El recurso no es un archivo: '+relative);
  return current;
}

function pwaResources(root,{sourceMode=false}={}){
  root=path.resolve(root);const directory=sourceMode?path.join(root,'source-entry'):root;
  const script=fs.readFileSync(path.join(directory,'sw.js'),'utf8');new vm.Script(script);
  const cache=script.match(/\bconst CACHE\s*=\s*(['"])([^'"\r\n]+)\1\s*;/);
  const precache=script.match(/\bconst PRECACHE\s*=\s*(\[[^;]*\])\s*;/);
  if(!cache||!precache)throw new Error('No se encontró CACHE/PRECACHE en '+path.relative(root,directory));
  const entries=vm.runInNewContext(precache[1],Object.create(null),{timeout:1000});
  if(!Array.isArray(entries)||!entries.length||entries.some(x=>typeof x!=='string'))throw new Error('PRECACHE debe ser una lista de rutas locales');
  const base=new URL('https://estudio.invalid/estudio/'),entry=sourceMode?'estudio.html':'index.html';
  const files=new Set([entry,'sw.js']),cachedFiles=new Set();
  for(const item of entries){
    if(!item.startsWith('./')||item.includes('\\')||/%(?:2f|5c)/i.test(item)||item.split('/').includes('..'))throw new Error('Ruta de precache no relativa o insegura: '+item);
    const url=new URL(item,base);
    if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname)||url.search||url.hash)throw new Error('Ruta fuera de la app: '+item);
    const relative=decodeURIComponent(url.pathname.slice(base.pathname.length))||entry;
    exactFile(directory,relative);files.add(relative);cachedFiles.add(relative);
  }
  return {cache:cache[2],entry,directory,files,cachedFiles,
    resolveRequest(relative){
      if(typeof relative!=='string'||/%(?:2f|5c)/i.test(relative))return null;
      let file;try{file=decodeURIComponent(relative)||entry;}catch{return null;}
      if(file.startsWith('/')||file.includes('\\')||file.split('/').includes('..')||!files.has(file))return null;
      return file;
    },
    mimeFor(file){return MIME[path.extname(file).toLowerCase()]||'application/octet-stream';},
    pathFor(file){if(!files.has(file))throw new Error('Recurso no permitido: '+file);return exactFile(directory,file);}
  };
}

async function waitForWorker(page,timeout=15000){
  try{
    await page.evaluate(async timeout=>{
      await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('La instalación del service worker no terminó')),timeout))]);
    },timeout);
  }catch(error){
    throw new Error('No se pudo instalar la PWA. Revisá que el servidor entregue todos los recursos de PRECACHE. '+error.message);
  }
}
module.exports={pwaResources,exactFile,waitForWorker};
