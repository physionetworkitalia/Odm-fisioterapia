import {initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut} from 'firebase/auth';
import {getFirestore,doc,getDocFromServer,onSnapshot,runTransaction,serverTimestamp} from 'firebase/firestore';
import {configureCatalog,isValidState} from './model.mjs';
import {prepareCommit} from './sync-core.mjs';

const config=__FIREBASE_CONFIG__,workspaceId=__WORKSPACE_ID__;
let auth,db,user,member,current,scenarioRef,stopScenario,stopMember,sessionGeneration=0;
const subscribers=new Set();let blockedHandler=()=>{};
export const isConfigured=()=>Boolean(config?.projectId&&config?.apiKey&&config?.authDomain&&config?.appId);
export function initializeCloud(){if(!isConfigured())throw Error('Configurazione Firebase da completare.');const app=initializeApp(config);auth=getAuth(app);auth.languageCode='it';db=getFirestore(app);}
export const watchAuth=cb=>onAuthStateChanged(auth,cb);
export async function login(){const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,provider);}
export async function logout(){stopSession();await signOut(auth);}
export function stopSession(){sessionGeneration++;stopScenario?.();stopMember?.();stopScenario=null;stopMember=null;current=null;user=null;member=null;subscribers.clear();}
export function onBlocked(cb){blockedHandler=cb;}
export function session(){if(!current||!user||!member)throw Error('Accesso richiesto.');return {current:structuredClone(current),user:{uid:user.uid,name:user.displayName||user.email||'Professionista',email:user.email},role:member.role};}
export function canEdit(){return ['owner','editor'].includes(member?.role);}
export function subscribeScenario(callback){subscribers.add(callback);return ()=>subscribers.delete(callback);}
function publish(data){if(!isValidState(data?.state)||!Number.isSafeInteger(data?.revision)||data.revision<1)throw Error('Dati cloud non validi: contatta l’amministratore.');if(current&&data.revision<current.revision)return;current={state:data.state,revision:data.revision};for(const callback of subscribers)callback(structuredClone(current));}
export async function openSession(authUser){
  const generation=++sessionGeneration;
  const memberRef=doc(db,'workspaces',workspaceId,'members',authUser.uid);
  const membership=await getDocFromServer(memberRef);
  if(!membership.exists()||membership.data().enabled!==true||!['owner','editor','viewer'].includes(membership.data().role)){const error=Error('Il tuo account deve essere abilitato dall’amministratore.');error.code='access/not-authorized';throw error;}
  const catalog=await getDocFromServer(doc(db,'workspaces',workspaceId,'catalog','main'));
  if(!catalog.exists())throw Error('I dati iniziali devono essere caricati dall’amministratore.');
  const ref=doc(db,'workspaces',workspaceId,'scenarios','main');
  const snapshot=await getDocFromServer(ref);
  if(!snapshot.exists())throw Error('Lo scenario condiviso deve essere inizializzato dall’amministratore.');
  if(generation!==sessionGeneration){const error=Error('Sessione sostituita.');error.code='session/cancelled';throw error;}
  configureCatalog(catalog.data());scenarioRef=ref;
  user=authUser;member=membership.data();publish(snapshot.data());
  stopScenario=onSnapshot(scenarioRef,snap=>{try{if(!snap.exists())throw Error('Scenario non disponibile.');publish(snap.data());}catch(error){blockedHandler(error);}},blockedHandler);
  stopMember=onSnapshot(memberRef,snap=>{if(!snap.exists()||snap.data().enabled!==true||snap.data().role!==member.role)blockedHandler(Error('Le autorizzazioni sono cambiate. Accedi di nuovo.'));},blockedHandler);
}
export async function commitScenario(expectedRevision,next){
  if(!user||!canEdit())throw Error('Hai accesso in sola consultazione.');
  if(!navigator.onLine)throw Error('Connessione assente: riconnettiti prima di salvare.');
  const userId=user.uid;
  const result=await runTransaction(db,async transaction=>{const snapshot=await transaction.get(scenarioRef);const prepared=prepareCommit(snapshot.exists()?snapshot.data():null,expectedRevision,next,userId);transaction.set(scenarioRef,{...prepared,updatedAt:serverTimestamp()});return prepared;});
  publish(result);return {state:structuredClone(result.state),revision:result.revision};
}
