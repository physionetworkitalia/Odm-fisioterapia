import {build} from 'esbuild';
import {readFile,mkdir,copyFile,rm,readdir} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('../firebase.web.json',import.meta.url),'utf8'));
const preview=process.argv.includes('--preview');
if(!preview&&!['apiKey','projectId','authDomain','appId'].every(k=>typeof config.firebase?.[k]==='string'&&config.firebase[k].trim()))throw Error('Collega il progetto Firebase in firebase.web.json prima di compilare per la pubblicazione.');
if(!/^[a-zA-Z0-9_-]+$/.test(config.workspaceId))throw Error('workspaceId non valido');
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await build({entryPoints:['src/boot.mjs'],bundle:true,splitting:true,format:'esm',platform:'browser',target:['es2022'],outdir:'dist',entryNames:'[name]',chunkNames:'chunks/[name]-[hash]',minify:true,define:{__FIREBASE_CONFIG__:JSON.stringify(config.firebase),__WORKSPACE_ID__:JSON.stringify(config.workspaceId)},metafile:true}).then(async result=>{
  const catalog=JSON.parse(await readFile('private/catalog.json','utf8'));
  const {outputs}=result.metafile;
  for(const output of Object.keys(outputs)){const content=await readFile(output,'utf8');for(const person of catalog.therapists)if(content.includes(person.name))throw Error(`Dato nominale presente nel bundle pubblico: ${output}`);}
});
await copyFile('src/index.html','dist/index.html');await copyFile('src/styles.css','dist/styles.css');
// esbuild emits .js files; the entry in the HTML is updated here.
const {writeFile}=await import('node:fs/promises');let html=await readFile('dist/index.html','utf8');await writeFile('dist/index.html',html.replace('src="boot.mjs"','src="boot.js"'));
console.log(preview&&!config.firebase?'Anteprima del blocco di accesso compilata; Firebase non ancora collegato.':'Versione Firebase compilata.');
