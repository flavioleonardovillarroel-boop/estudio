const fs=require('fs'),http=require('http'),path=require('path');
const root=path.resolve(__dirname,'..');
const files={'/':'index.html','/index.html':'index.html','/sw.js':'sw.js','/manifest.webmanifest':'manifest.webmanifest','/icon.svg':'icon.svg','/materiales/logistica-repaso-final.docx':'materiales/logistica-repaso-final.docx'};
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
const server=http.createServer((req,res)=>{const file=files[new URL(req.url,'http://localhost').pathname];if(req.method!=='GET'||!file){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});res.end(fs.readFileSync(path.join(root,file)));});
server.listen(4173,'127.0.0.1',()=>console.log('Estudio local: http://127.0.0.1:4173/ — Ctrl+C para cerrar. Se sirven los recursos de la PWA y la guía de Logística.'));
