export async function connect(config,handlers){
 const [A,U,F]=await Promise.all(['app','auth','firestore'].map(x=>import(`https://www.gstatic.com/firebasejs/13.1.0/firebase-${x}.js`)));
 const app=A.initializeApp(config.firebase),auth=U.getAuth(app),db=F.initializeFirestore(app,{localCache:F.memoryLocalCache()});
 await U.setPersistence(auth,U.browserSessionPersistence);
 const root=`clinics/${config.clinicId}`,ref=(...p)=>F.doc(db,root,...p),stateRef=ref('data','state');
 let user=null,member=null,offs=[],memberOff=null,dayOffs=[],generation=0;
 const clear=()=>{offs.forEach(f=>f());offs=[];dayOffs.forEach(f=>f());dayOffs=[];member=null;generation++;};
 const error=e=>handlers.error(e);
 U.onAuthStateChanged(auth,u=>{clear();memberOff?.();user=u;handlers.auth(u);if(!u)return;
  memberOff=F.onSnapshot(ref('members',u.uid),snap=>{const m=snap.exists()?snap.data():null;clear();member=m;if(!m?.active){handlers.denied(u);return;}handlers.member(m);offs.push(F.onSnapshot(stateRef,{includeMetadataChanges:true},s=>handlers.state(s.exists()?s.data():null,!s.metadata.fromCache),error));},e=>{clear();handlers.denied(u);error(e);});
 });
 const allowed=()=>{if(!user||!member?.active)throw Error('Accesso non autorizzato.');};
 const coord=()=>{allowed();if(member.role!=='coordinator')throw Error('Operazione riservata al coordinatore.');};
 const audit=(tx,action)=>tx.set(F.doc(F.collection(db,root,'audit')),{action,actor:user.uid,at:F.serverTimestamp()});
 return {
  login:()=>U.signInWithPopup(auth,new U.GoogleAuthProvider()),logout:()=>U.signOut(auth),
  async save(data,expected,action){coord();return F.runTransaction(db,async tx=>{const snap=await tx.get(stateRef),rev=snap.exists()?snap.data().revision:0;if(rev!==expected)throw Error('Un collega ha aggiornato i dati. Riapri la scheda prima di salvare.');tx.set(stateRef,{payload:data,revision:rev+1,updatedBy:user.uid,updatedAt:F.serverTimestamp()});audit(tx,action);});},
  subscribeDay(date,onPlan,onDone,onPrevious){allowed();dayOffs.forEach(f=>f());dayOffs=[];const my=++generation;
   dayOffs.push(F.onSnapshot(ref('plans',date),s=>{if(my===generation)onPlan(s.exists()?s.data():null);},error));
   dayOffs.push(F.onSnapshot(F.collection(db,root,'plans',date,'completions'),s=>{if(my===generation)onDone(Object.fromEntries(s.docs.map(x=>[x.id,x.data().done])));},error));
   dayOffs.push(F.onSnapshot(F.query(F.collection(db,root,'plans'),F.where('date','<',date),F.orderBy('date','desc'),F.limit(1)),s=>{if(my===generation)onPrevious(s.empty?null:s.docs[0].data());},error));
  },
  async finalize(date,rows,expected,assignments,expectedVersion=0){coord();const day=ref('plans',date);return F.runTransaction(db,async tx=>{const state=await tx.get(stateRef),old=await tx.get(day);if(!state.exists()||state.data().revision!==expected)throw Error('Dati cambiati: controlla il piano aggiornato e riprova.');const version=old.exists()?old.data().version:0;if(version!==expectedVersion)throw Error('Un collega ha pubblicato una nuova revisione. Controlla il piano aggiornato.');if(old.exists())tx.set(ref('plans',date,'versions',String(version)),old.data());tx.set(day,{date,version:version+1,rows,assignments,sourceRevision:expected,createdBy:user.uid,createdAt:F.serverTimestamp()});audit(tx,`Pubblicazione ${date} v${version+1}`);});},
  async done(date,pid,done){allowed();await F.setDoc(ref('plans',date,'completions',pid),{done,updatedBy:user.uid,updatedAt:F.serverTimestamp()});},
  async member(uid,data){coord();if(uid===user.uid)throw Error('Non puoi modificare il tuo accesso.');await F.setDoc(ref('members',uid),data);},
  async members(){coord();const s=await F.getDocs(F.collection(db,root,'members'));return s.docs.map(x=>({uid:x.id,...x.data()}));}
 };
}
