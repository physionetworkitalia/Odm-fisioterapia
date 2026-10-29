import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
test('pubblicazione bloccata senza configurazione e nessun dato nominale nei file pubblici',()=>{
 const config=JSON.parse(readFileSync('firebase.web.json'));
 if(!config.firebase){const denied=spawnSync(process.execPath,['scripts/build.mjs'],{encoding:'utf8'});assert.notEqual(denied.status,0);assert.match(denied.stderr,/Collega il progetto Firebase/);}
 const compiled=spawnSync(process.execPath,['scripts/build.mjs','--preview'],{encoding:'utf8'});assert.equal(compiled.status,0,compiled.stderr);
 const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
 const content=walk('dist').map(file=>readFileSync(file,'utf8')).join('\n');const catalog=JSON.parse(readFileSync('private/catalog.json'));
 for(const person of catalog.therapists)assert.ok(!content.includes(person.name),`Cognome esposto: ${person.name}`);
 assert.ok(!content.includes('Francesco Panico'));assert.ok(!walk('dist').some(file=>file.endsWith('catalog.json')));
 assert.match(readFileSync('dist/index.html','utf8'),/id="application" hidden inert/);
});
