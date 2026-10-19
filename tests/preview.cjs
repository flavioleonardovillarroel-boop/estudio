const fs=require('fs'),http=require('http'),path=require('path');
const root=path.resolve(__dirname,'..');
const {pwaResources}=require('./helpers/pwa-resources.cjs'),resources=pwaResources(root);
const server=http.createServer((req,res)=>{const file=resources.resolveRequest(new URL(req.url,'http://localhost').pathname.slice(1));if(req.method!=='GET'||file===null){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':resources.mimeFor(file),'Cache-Control':'no-store'});res.end(fs.readFileSync(resources.pathFor(file)));});
server.listen(4173,'127.0.0.1',()=>console.log('Estudio local: http://127.0.0.1:4173/ — Ctrl+C para cerrar. Recursos derivados del precache: '+resources.files.size));
