import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {configureCatalog,initialState,setPersonDepartment} from '../src/model.mjs';
import {prepareCommit} from '../src/sync-core.mjs';
configureCatalog(JSON.parse(readFileSync(new URL('../private/catalog.json',import.meta.url))));
test('due dispositivi: il secondo non può sovrascrivere una revisione più recente',()=>{const base=initialState(),first=prepareCommit({revision:1,state:base},1,setPersonDepartment(base,'F07','R01'),'owner');assert.equal(first.revision,2);assert.equal(first.state.assignments.F07,'R01');assert.throws(()=>prepareCommit(first,1,setPersonDepartment(base,'F08','R03'),'owner'),e=>e.code==='scenario/conflict');});
test('nuova modifica sui dati aggiornati conserva lo spostamento precedente',()=>{const base=initialState(),first=prepareCommit({revision:1,state:base},1,setPersonDepartment(base,'F07','R01'),'owner');const next=prepareCommit(first,2,setPersonDepartment(first.state,'F08','R03'),'editor');assert.equal(next.state.assignments.F07,'R01');assert.equal(next.state.assignments.F08,'R03');assert.equal(next.state.history.length,2);});
test('nessun salvataggio di dati invalidi, identità assente o scenario non inizializzato',()=>{const s=initialState();assert.throws(()=>prepareCommit(null,1,s,'owner'));assert.throws(()=>prepareCommit({revision:1},1,s,''));s.assignments.F07='inesistente';assert.throws(()=>prepareCommit({revision:1},1,s,'owner'));});
