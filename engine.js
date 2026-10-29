(function(root){
'use strict';
const isDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
const active=(p,d)=>p.admission<=d&&(!p.discharge||p.discharge>=d);
function destination(s,t,d){const r=s.rotations[d.slice(0,7)];return r?(Object.keys(r).find(k=>r[k]===t.team)||'Altri reparti'):'Altri reparti';}
function status(s,t,d){return s.availability[d]?.[t.id]||(s.dhIsBarra&&destination(s,t,d)==='DH'?'Barra':'Presente');}
function allocate(s,d,rebalance=false){
 const staff=s.staff.filter(t=>status(s,t,d)==='Presente'),counts=Object.fromEntries(staff.map(t=>[t.id,0])),assignments={};
 const patients=s.patients.filter(p=>active(p,d)).sort((a,b)=>a.admission.localeCompare(b.admission)||a.id.localeCompare(b.id));
 const pending=[],floor=p=>s.wardFloors[p.ward]||'';
 for(const p of patients){const id=s.plans[d]?.[p.id]||p.owner;if(Object.hasOwn(counts,id)){assignments[p.id]=id;counts[id]++;}else pending.push(p);}
 function affinity(t,p){const mine=patients.filter(q=>assignments[q.id]===t.id),wards={};for(const q of mine)wards[q.ward]=(wards[q.ward]||0)+1;const dominant=Object.keys(wards).sort((a,b)=>wards[b]-wards[a]||a.localeCompare(b))[0]||destination(s,t,d);return (wards[p.ward]||0)*10000+(p.ward===dominant?1000:0)+(floor(p)&&floor(p)===(s.wardFloors[dominant]||'')?100:0)+mine.filter(q=>floor(p)&&floor(q)===floor(p)).length;}
 const volumes={};for(const p of pending)volumes[p.ward]=(volumes[p.ward]||0)+1;
 pending.sort((a,b)=>volumes[b.ward]-volumes[a.ward]||a.ward.localeCompare(b.ward)||a.id.localeCompare(b.id));
 for(const p of pending){const min=Math.min(...Object.values(counts));const best=staff.filter(t=>counts[t.id]===min).sort((a,b)=>affinity(b,p)-affinity(a,p)||a.id.localeCompare(b.id))[0];assignments[p.id]=best?.id||null;if(best)counts[best.id]++;}
 if(rebalance&&staff.length){while(Math.max(...Object.values(counts))-Math.min(...Object.values(counts))>1){const min=Math.min(...Object.values(counts)),max=Math.max(...Object.values(counts)),high=staff.find(t=>counts[t.id]===max);const moves=patients.filter(p=>assignments[p.id]===high.id).flatMap(p=>staff.filter(t=>counts[t.id]===min).map(t=>({p,t,score:affinity(t,p)-affinity(high,p)}))).sort((a,b)=>b.score-a.score||a.p.id.localeCompare(b.p.id)||a.t.id.localeCompare(b.t.id));const m=moves[0];assignments[m.p.id]=m.t.id;counts[high.id]--;counts[m.t.id]++;}}
 return {patients,staff,counts,assignments};
}
function rows(s,d){const a=allocate(s,d);return a.patients.map(p=>({...p,operatorId:a.assignments[p.id]||'',operatorName:s.staff.find(t=>t.id===a.assignments[p.id])?.name||'Non assegnato',floor:s.wardFloors[p.ward]||''}));}
function diff(current,previous,operator,s,d){const mine=current.filter(p=>p.operatorId===operator),old=previous?.filter(p=>p.operatorId===operator)||[],fields=['first','last','ward','room','floor','diagnosis','treatment'];return {entries:mine.map(p=>{const before=old.find(q=>q.id===p.id),other=previous?.find(q=>q.id===p.id);const change=!previous?'Non confrontabile':!before?'Aggiunto':fields.some(k=>p[k]!==before[k])?'Aggiornato':'Confermato';return {...p,change,detail:change==='Aggiunto'&&other?`Da ${other.operatorName}`:change};}),removed:old.filter(p=>!mine.some(q=>q.id===p.id)).map(p=>{const now=current.find(q=>q.id===p.id),record=s.patients.find(q=>q.id===p.id);return {...p,change:'Rimosso',detail:now?(now.operatorId?`Passato a ${now.operatorName}`:'Ora senza operatore'):record?.discharge&&record.discharge<d?'Dimesso':'Non attivo nella giornata'};})};}
function validate(s){
 const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),text=(x,n)=>typeof x==='string'&&x.length<=n,fail=m=>{throw Error(m);};
 if(!obj(s)||s.version!==2||!Array.isArray(s.staff)||s.staff.length!==15||!Array.isArray(s.patients)||s.patients.length>500)fail('Struttura non valida o limite di 500 pazienti superato.');
 const ids=new Set();for(const t of s.staff){if(!/^F\d{2}$/.test(t.id)||ids.has(t.id)||!text(t.name,100)||!t.name.trim()||!Number.isInteger(t.team)||t.team<1||t.team>5)fail('Operatore non valido.');ids.add(t.id);}
 for(const key of ['wardFloors','rotations','availability','plans'])if(!obj(s[key]))fail('Configurazione non valida.');if(typeof s.dhIsBarra!=='boolean')fail('Opzione DH non valida.');
 for(const [w,f]of Object.entries(s.wardFloors))if(!text(w,100)||!w.trim()||['__proto__','constructor','prototype'].includes(w)||!text(f,40))fail('Reparto o ubicazione non valido.');
 const pids=new Set();for(const p of s.patients){if(!/^[-a-zA-Z0-9]{1,80}$/.test(p.id)||pids.has(p.id))fail('ID paziente duplicato o non valido.');pids.add(p.id);for(const k of ['first','last','room','ward','diagnosis','treatment'])if(!text(p[k],k==='diagnosis'||k==='treatment'?600:100)||!p[k].trim())fail('Completa la scheda paziente.');if(!Object.hasOwn(s.wardFloors,p.ward)||!isDate(p.admission)||(p.discharge&&(!isDate(p.discharge)||p.discharge<p.admission))||(p.owner!==null&&!ids.has(p.owner)))fail('Date, reparto o riferimento non validi.');}
 for(const [m,r]of Object.entries(s.rotations))if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)||!obj(r)||Object.keys(r).some(k=>!['DH','Ortopedia','Rianimazione'].includes(k))||Object.values(r).some(x=>!Number.isInteger(x)||x<1||x>5)||new Set(Object.values(r)).size!==Object.values(r).length)fail('Rotazione non valida.');
 for(const [d,map]of Object.entries(s.availability))if(!isDate(d)||!obj(map)||Object.entries(map).some(([id,x])=>!ids.has(id)||!['Presente','Assente','Barra'].includes(x)))fail('Presenza non valida.');
 for(const [d,map]of Object.entries(s.plans))if(!isDate(d)||!obj(map)||Object.entries(map).some(([id,x])=>!pids.has(id)||!ids.has(x)))fail('Assegnazione non valida.');
 if(new TextEncoder().encode(JSON.stringify(s)).length>700000)fail('Archivio operativo oltre 700 KB: richiedere manutenzione.');return s;
}
const api={isDate,active,destination,status,allocate,rows,diff,validate};if(typeof module!=='undefined')module.exports=api;else root.FisioEngine=api;
})(globalThis);
