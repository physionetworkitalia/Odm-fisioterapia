import {isConfigured,initializeCloud,watchAuth,login,logout,openSession,stopSession,onBlocked} from './cloud.mjs';
const gate=document.querySelector('#auth-gate'),application=document.querySelector('#application'),message=document.querySelector('#auth-message'),loginButton=document.querySelector('#login-btn'),signoutButton=document.querySelector('#gate-signout-btn');
let generation=0,unmount=()=>{};
function showGate(text,{allowLogin=true,allowSignout=false,uid=''}={}){application.hidden=true;application.inert=true;gate.hidden=false;message.textContent=text;loginButton.hidden=!allowLogin;signoutButton.hidden=!allowSignout;document.querySelector('#setup-details').hidden=!uid;document.querySelector('#setup-detail-text').textContent=uid?`UID Firebase dell’account: ${uid}`:'';}
const errorMessage=e=>({'auth/popup-blocked':'Il browser ha bloccato la finestra di accesso. Consenti il popup per questo sito e riprova.','auth/popup-closed-by-user':'Accesso annullato. Puoi riprovare quando vuoi.','auth/unauthorized-domain':'Questo dominio deve essere autorizzato nelle impostazioni Firebase.','permission-denied':'Il tuo account non è abilitato a questo spazio.','unavailable':'Connessione al cloud non disponibile. Riprova tra poco.'}[e?.code]||e?.message||'Accesso non riuscito. Riprova.');
loginButton.onclick=async()=>{loginButton.disabled=true;try{await login();}catch(e){message.textContent=errorMessage(e);}finally{loginButton.disabled=false;}};
signoutButton.onclick=async()=>{await logout();};
document.querySelector('#signout-btn').onclick=async()=>{await logout();};
if(!isConfigured())showGate('Il progetto Firebase deve essere collegato prima di usare la versione cloud.',{allowLogin:false});
else{
 initializeCloud();
 onBlocked(error=>{generation++;unmount();stopSession();showGate(errorMessage(error),{allowSignout:true});});
 watchAuth(async user=>{const epoch=++generation;unmount();stopSession();if(document.querySelector('#modal').open)document.querySelector('#modal').close();if(!user){showGate('Accedi per consultare reparti e assegnazioni condivise.');return;}showGate('Caricamento dello spazio riservato…',{allowLogin:false});try{await openSession(user);if(epoch!==generation)return;const app=await import('./app.mjs');if(epoch!==generation)return;unmount=app.mount();gate.hidden=true;application.hidden=false;application.inert=false;}catch(error){if(epoch!==generation)return;stopSession();showGate(errorMessage(error),{allowLogin:false,allowSignout:true,uid:user.uid});}});
}
