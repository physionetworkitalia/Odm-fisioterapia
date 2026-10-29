export let DEPARTMENTS = [];
export let THERAPISTS = [];
export function configureCatalog(catalog) {
  if(catalog?.version!==1 || !Array.isArray(catalog.departments) || catalog.departments.length!==18 || !Array.isArray(catalog.therapists) || catalog.therapists.length!==15) throw Error('Catalogo non valido');
  const ids = new Set(catalog.departments.map(d=>d.id));
  if(ids.size!==18 || catalog.departments.some(d=>!/^R\d{2}$/.test(d.id)||typeof d.name!=='string'||!d.name.trim()||!((BUILDINGS.includes(d.building)&&Number.isInteger(d.floor)&&d.floor>=0&&d.floor<=7)||(d.building===null&&d.floor===null)))) throw Error('Reparti non validi');
  if(new Set(catalog.therapists.map(p=>p.id)).size!==15 || catalog.therapists.some(p=>!/^F\d{2}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||!Number.isInteger(p.team)||p.team<1||p.team>5||!ids.has(p.base))) throw Error('Fisioterapisti non validi');
  DEPARTMENTS = structuredClone(catalog.departments);
  THERAPISTS = structuredClone(catalog.therapists);
}
export const BUILDINGS = ['HP','HD1','HD2','HD3'];
export const initialState = ()=>({version:1,departments:structuredClone(DEPARTMENTS),assignments:Object.fromEntries(THERAPISTS.map(p=>[p.id,p.base])),history:[]});
export const normalize = s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const floorLabel = floor=>floor===null?'Piano da definire':floor===0?'Piano terra':`${floor}° piano`;
export const departmentName = (state,id)=>state.departments.find(d=>d.id===id)?.name??'Non assegnato';
export function isValidState(s){
  const validDept=id=>id===null||DEPARTMENTS.some(d=>d.id===id);
  const validLocation=l=>l&&(l.building===null&&l.floor===null||BUILDINGS.includes(l.building)&&Number.isInteger(l.floor)&&l.floor>=0&&l.floor<=7);
  return Boolean(s?.version===1 && Array.isArray(s.departments) && s.departments.length===18 && DEPARTMENTS.every(base=>s.departments.filter(d=>d?.id===base.id && d.name===base.name && validLocation(d)).length===1) && s.assignments && THERAPISTS.every(p=>validDept(s.assignments[p.id])) && Array.isArray(s.history) && s.history.length<=100 && s.history.every(h=>h&&typeof h.id==='string'&&typeof h.at==='string'&&Number.isFinite(Date.parse(h.at))&&(h.type==='assignment'?Array.isArray(h.changes)&&h.changes.every(c=>c&&THERAPISTS.some(p=>p.id===c.personId)&&validDept(c.from)&&validDept(c.to)):h.type==='location'&&h.departmentId!==null&&validDept(h.departmentId)&&validLocation(h.from)&&validLocation(h.to))));
}
export function changedCount(state){
  return THERAPISTS.filter(p=>state.assignments[p.id]!==p.base).length + state.departments.filter(d=>{const b=DEPARTMENTS.find(x=>x.id===d.id);return d.building!==b.building||d.floor!==b.floor;}).length;
}
function record(s,item){const id=globalThis.crypto?.randomUUID?.()??`sim-${Date.now()}-${Math.random().toString(36).slice(2)}`;s.history.unshift({id,at:new Date().toISOString(),...item});s.history=s.history.slice(0,100);return s;}
export function setDepartmentTeam(state,departmentId,selected){
  if(!DEPARTMENTS.some(d=>d.id===departmentId)||selected.some(id=>!THERAPISTS.some(p=>p.id===id)))throw Error('Assegnazione non valida');
  const next=structuredClone(state),changes=[];
  for(const p of THERAPISTS){const from=next.assignments[p.id];let to=from;if(selected.includes(p.id))to=departmentId;else if(from===departmentId)to=null;if(to!==from){changes.push({personId:p.id,from,to});next.assignments[p.id]=to;}}
  return changes.length?record(next,{type:'assignment',changes}):state;
}
export function setPersonDepartment(state,personId,to){
  if(!THERAPISTS.some(p=>p.id===personId)||(to!==null&&!DEPARTMENTS.some(d=>d.id===to)))throw Error('Assegnazione non valida');
  const from=state.assignments[personId];if(from===to)return state;
  const next=structuredClone(state);next.assignments[personId]=to;return record(next,{type:'assignment',changes:[{personId,from,to}]});
}
export function setLocation(state,departmentId,building,floor){
  if(!(BUILDINGS.includes(building)&&Number.isInteger(floor)&&floor>=0&&floor<=7)&&!(building===null&&floor===null))throw Error('Completa palazzina e piano');
  const current=state.departments.find(d=>d.id===departmentId);if(!current)throw Error('Reparto non valido');if(current.building===building&&current.floor===floor)return state;
  const next=structuredClone(state),d=next.departments.find(d=>d.id===departmentId),from={building:d.building,floor:d.floor};d.building=building;d.floor=floor;return record(next,{type:'location',departmentId,from,to:{building,floor}});
}
export function filterDepartments(state,{query='',building='',floor='',coverage='',team=''}={}){
  const q=normalize(query);
  return state.departments.filter(d=>{const people=THERAPISTS.filter(p=>state.assignments[p.id]===d.id);return (!q||normalize([d.name,d.building,floorLabel(d.floor),...people.map(p=>p.name+' '+p.id)].join(' ')).includes(q))&&(!building||(building==='unknown'?!d.building:d.building===building))&&(floor===''||String(d.floor)===floor)&&(coverage===''||(coverage==='assigned'?people.length>0:people.length===0))&&(!team||people.some(p=>p.team===Number(team)));});
}
export function filterTherapists(state,{query='',building='',team='',coverage=''}={}){
  const q=normalize(query);return THERAPISTS.filter(p=>{const d=state.departments.find(d=>d.id===state.assignments[p.id]);return (!q||normalize(`${p.name} ${p.id} ${d?.name??''} squadra ${p.team}`).includes(q))&&(!building||(building==='unknown'?d&&!d.building:d?.building===building))&&(!team||p.team===Number(team))&&(!coverage||(coverage==='assigned'?!!d:!d));});
}
