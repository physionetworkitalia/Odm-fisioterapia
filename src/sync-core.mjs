import {isValidState} from './model.mjs';
export function prepareCommit(current,expectedRevision,next,userId){
  if(!current||!Number.isSafeInteger(current.revision)||current.revision!==expectedRevision){const e=Error('Lo scenario è stato aggiornato da un altro dispositivo. Riapri la modifica sui dati aggiornati.');e.code='scenario/conflict';throw e;}
  if(!isValidState(next))throw Error('Lo scenario non è valido. Nessun dato è stato salvato.');
  if(!userId)throw Error('Accesso richiesto.');
  return {state:structuredClone(next),revision:current.revision+1,updatedBy:userId};
}
