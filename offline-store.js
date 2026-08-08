(function(){
  const DB_NAME='blood-pressure-journal-offline';
  const STORE_NAME='pending-measurements';
  function db(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE_NAME,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
  async function run(mode,value){const database=await db();return new Promise((resolve,reject)=>{const transaction=database.transaction(STORE_NAME,mode);const request=value===undefined?transaction.objectStore(STORE_NAME).getAll():transaction.objectStore(STORE_NAME)[mode==='readwrite'&&value?.id?'put':'delete'](value);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
  window.bpOfflineStore={add:item=>run('readwrite',item),all:()=>run('readonly'),remove:id=>run('readwrite',id)};
})();
