// Supabase connection, cloud sync, and offline queue support.
(async function(){
  const cfg=window.SUPABASE_CONFIG;
  const clientKey=cfg?.publishableKey||cfg?.anonKey;
  if(!cfg || !cfg.url || cfg.url.includes('YOUR-PROJECT') || !clientKey || !window.supabase) return;

  const client=window.supabase.createClient(cfg.url,clientKey);
  const members={
    admin:{name:'管理員 k5star',email:'bp-admin@family-bp.local'},
    dad:{name:'春林',email:'bp-dad@family-bp.local'},
    mom:{name:'幼蘭',email:'bp-mom@family-bp.local'},
    brother:{name:'盧大寶',email:'bp-brother@family-bp.local'},
    'sister-in-law':{name:'戈小寶',email:'bp-sister-in-law@family-bp.local'},
    'child-1':{name:'盧小豬',email:'bp-child-1@family-bp.local'},
    'child-2':{name:'盧小珊',email:'bp-child-2@family-bp.local'},
    'child-3':{name:'盧小白',email:'bp-child-3@family-bp.local'},
    'child-4':{name:'盧小龍',email:'bp-child-4@family-bp.local'}
  };
  let session=null;
  let setupMode=false;
  const LOAD_LIMIT=100;
  window.bpPhotoFile=null;

  const currentMember=()=>members[$('#memberInput').value];
  function setCloudUser(user){
    const member=Object.values(members).find(item=>item.email===user?.email);
    state.user=user?{id:user.id,name:member?.name||user.user_metadata?.name||currentMember().name,email:user.email}:null;
    save();
  }
  function updateAuthUI(){
    const member=currentMember();
    $('#emailInput').value=member.email;
    $('#authTitle').textContent=setupMode?`設定 ${member.name} 的密碼`:`${member.name}，登入你的帳戶`;
    $('#authSubtitle').textContent=setupMode?'第一次使用時，設定一組專屬密碼。':'每天一點記錄，讓健康更有跡可循。';
    $('#confirmPasswordField').classList.toggle('hidden',!setupMode);
    $('#authSubmit').textContent=setupMode?'設定並登入':'登入';
    $('#setupMemberBtn').innerHTML=setupMode?'已設定過密碼？ <strong>返回登入</strong>':'第一次使用此成員？ <strong>設定密碼</strong>';
    $('#passwordInput').value=''; $('#confirmPasswordInput').value='';
  }
  async function loadRecords(){
    if(!session){return}
    const [bloodPressure,body]=await Promise.all([
      client.from('bp_measurements').select('*').order('measured_at',{ascending:false}).limit(LOAD_LIMIT),
      client.from('body_measurements').select('*').order('measured_at',{ascending:false}).limit(LOAD_LIMIT)
    ]);
    if(bloodPressure.error){console.error(bloodPressure.error);toast('讀取血壓紀錄失敗');return}
    if(body.error){console.error(body.error);toast('讀取身高體重紀錄失敗，請先執行最新 Supabase SQL');return}
    state.records=(bloodPressure.data||[]).map(r=>({id:r.id,userId:r.user_id,memberName:r.member_name,date:r.measured_at,sys:r.systolic,dia:r.diastolic,pulse:r.pulse,photoPath:r.photo_path}));
    state.bodyRecords=(body.data||[]).map(r=>({id:r.id,userId:r.user_id,memberName:r.member_name,date:r.measured_at,height:r.height_cm,weight:r.weight_kg,bmi:r.bmi}));
    save();
  }
  async function syncPendingRecords(){
    if(!navigator.onLine || !session || !window.bpOfflineStore) return;
    const pending=await window.bpOfflineStore.all();
    let synced=0;
    for(const item of pending.filter(entry=>entry.userId===session.user.id)){
      const table=item.type==='body'?'body_measurements':'bp_measurements';
      const payload=item.type==='body'
        ?{user_id:item.userId,member_name:item.memberName,height_cm:item.height,weight_kg:item.weight,bmi:item.bmi,measured_at:item.date}
        :{user_id:item.userId,member_name:item.memberName,systolic:item.sys,diastolic:item.dia,pulse:item.pulse,measured_at:item.date};
      const {error}=await client.from(table).insert(payload);
      if(error){console.error(error);break}
      await window.bpOfflineStore.remove(item.id);
      synced++;
    }
    if(synced){await loadRecords();renderAll();toast(`已同步 ${synced} 筆離線紀錄`)}
  }
  async function saveOffline(type,payload){
    const record=await window.queueOfflineMeasurement(type,payload);
    if(type==='body') state.bodyRecords.unshift(record); else state.records.unshift(record);
    save();renderAll();
  }

  $('#memberInput').onchange=()=>{setupMode=false;updateAuthUI()};
  $('#setupMemberBtn').onclick=()=>{setupMode=!setupMode;updateAuthUI()};
  $('#authForm').onsubmit=async e=>{
    e.preventDefault();
    if(!navigator.onLine){toast('首次登入或設定密碼需要網路');return}
    const member=currentMember(),password=$('#passwordInput').value,confirm=$('#confirmPasswordInput').value;
    if(password.length<6){toast('密碼至少需要 6 個字元');return}
    if(setupMode&&password!==confirm){toast('兩次密碼不相同');return}
    const result=setupMode
      ?await client.auth.signUp({email:member.email,password,options:{data:{name:member.name,family_member:$('#memberInput').value}}})
      :await client.auth.signInWithPassword({email:member.email,password});
    if(result.error){toast(result.error.message.includes('email rate limit')?'寄信次數過多，請確認已關閉 Supabase 的 Email confirmation。':result.error.message);return}
    session=result.data.session;
    if(!session){toast('帳號已建立；請確認 Supabase 已關閉 Email confirmation 後再登入。');return}
    setCloudUser(session.user); await syncPendingRecords(); await loadRecords(); renderAuth(); toast(`${member.name}，登入成功`);
  };
  $('#logoutBtn').onclick=async()=>{await client.auth.signOut();session=null;state.user=null;state.records=[];state.bodyRecords=[];save();renderAuth();updateAuthUI();toast('已登出')};
  $('#photoInput').addEventListener('change',e=>{window.bpPhotoFile=e.target.files[0]||null});
  $('#bodyRecordForm').onsubmit=async e=>{
    e.preventDefault();
    const height=+$('#heightInput').value,weight=+$('#weightInput').value,bmi=Number((weight/((height/100)**2)).toFixed(1));
    if(!height||!weight){toast('請輸入身高和體重');return}
    const btn=$('#saveBodyRecord');btn.disabled=true;
    try{
      if(!navigator.onLine||!session){await saveOffline('body',{height,weight,bmi});$('#bodyRecordForm').reset();toast('目前離線，已暫存手機');return}
      const insert=await client.from('body_measurements').insert({user_id:session.user.id,member_name:state.user.name,height_cm:height,weight_kg:weight,bmi}).select().single();
      if(insert.error)throw insert.error;
      const r=insert.data;state.bodyRecords.unshift({id:r.id,userId:r.user_id,memberName:r.member_name,date:r.measured_at,height:r.height_cm,weight:r.weight_kg,bmi:r.bmi});
      save();$('#bodyRecordForm').reset();renderAll();toast('身高體重已儲存');
    }catch(err){console.error(err);if(!navigator.onLine){await saveOffline('body',{height,weight,bmi});$('#bodyRecordForm').reset();toast('連線中斷，已暫存手機')}else toast('儲存失敗：'+err.message)}finally{btn.disabled=false;btn.textContent='儲存身高體重'}
  };
  $('#saveRecord').onclick=async()=>{
    const sys=+$('#sysInput').value,dia=+$('#diaInput').value,pulse=+$('#pulseInput').value;
    if(!sys||!dia||!pulse){toast('請確認三項數值都已填寫');return}
    const btn=$('#saveRecord');btn.disabled=true;
    try{
      if(!navigator.onLine||!session){await saveOffline('blood-pressure',{sys,dia,pulse});closeModal();toast('目前離線，已暫存手機');return}
      btn.textContent='正在儲存數值…';
      const insert=await client.from('bp_measurements').insert({user_id:session.user.id,member_name:state.user.name,systolic:sys,diastolic:dia,pulse}).select().single();
      if(insert.error)throw insert.error;
      const r=insert.data;state.records.unshift({id:r.id,userId:r.user_id,memberName:r.member_name,date:r.measured_at,sys:r.systolic,dia:r.diastolic,pulse:r.pulse,photoPath:null});
      save();closeModal();renderAll();toast('血壓紀錄已儲存');
    }catch(err){console.error(err);if(!navigator.onLine){await saveOffline('blood-pressure',{sys,dia,pulse});closeModal();toast('連線中斷，已暫存手機')}else toast('儲存失敗：'+err.message)}finally{btn.disabled=false;btn.textContent='儲存這次測量'}
  };
  window.addEventListener('online',syncPendingRecords);
  const {data}=await client.auth.getSession();session=data.session;setCloudUser(session?.user||null);if(session){await syncPendingRecords();await loadRecords()}updateAuthUI();renderAuth();
})();
