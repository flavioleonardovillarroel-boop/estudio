const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),results=process.env.ESTUDIO_TEST_OUTPUT||path.join(root,'test-results');
fs.mkdirSync(results,{recursive:true});
const names=['validate.js','smoke.js','smoke-lre.js','smoke-aux.js','smoke-mando.js','smoke-sustancias.js','test-examen-mortero.js'];
const records=[];
for(const name of names){const r=cp.spawnSync(process.execPath,[path.join(__dirname,'legacy',name)],{encoding:'utf8'});records.push({name,exitCode:r.status,stdout:r.stdout,stderr:r.stderr});console.log(name+': '+(r.status===0?'PASS':'FAIL'));if(r.status!==0)console.log(r.stdout,r.stderr);}
const integrity=cp.spawnSync(process.execPath,[path.join(__dirname,'integrity.cjs')],{encoding:'utf8'});records.push({name:'integrity.cjs',exitCode:integrity.status,stdout:integrity.stdout,stderr:integrity.stderr});console.log(integrity.stdout);if(integrity.status!==0)console.error(integrity.stderr);
fs.writeFileSync(path.join(results,'regression.json'),JSON.stringify(records,null,2));
if(records.some(r=>r.exitCode!==0))process.exit(1);
