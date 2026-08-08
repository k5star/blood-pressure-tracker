// Optional cloud mode for GitHub Pages. If no valid config exists, app.js keeps local demo mode.
(async function(){
  const cfg=window.SUPABASE_CONFIG;
  if(!cfg || !cfg.url || cfg.url.includes('YOUR-PROJECT') || !window.supabase) return;
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  let session=null;
  window.bpPhotoFile=null;

  function setCloudUser(user){
    state.user=user?{id:user.id,name:user.user_metadata?.name||user.email?.split('@')[0]||'朋友',email:user.email}:null;
  }
  async function loadRecords(){
    if(!session){state.records=[];return}
    const {data,error}=await client.from('measurements').select('*').order('measured_at',{ascending:false});
    if(error){console.error(error);toast('讀取雲端紀錄失敗');return}
    state.records=(data||[]).map(r=>({id:r.id,date:r.measured_at,sys:r.systolic,dia:r.diastolic,pulse:r.pulse,photoPath:r.photo_path}));
  }
  $('#authForm').onsubmit=async e=>{
    e.preventDefault(); const email=$('#emailInput').value.trim(); const password=$('#passwordInput').value; const name=$('#nameInput').value.trim()||'朋友';
    if(!email||password.length<6){toast('請輸入帳號與至少 6 個字元的密碼');return}
    const result=isSignup?await client.auth.signUp({email,password,options:{data:{name}}}):await client.auth.signInWithPassword({email,password});
    if(result.error){toast(result.error.message.includes('Invalid login')?'帳號或密碼不正確':result.error.message);return}
    session=result.data.session;
    if(!session){toast('註冊完成，請先到信箱完成驗證');return}
    setCloudUser(session.user); await loadRecords(); renderAuth(); toast(isSignup?'帳戶建立完成':'登入成功');
  };
  $('#logoutBtn').onclick=async()=>{await client.auth.signOut();session=null;setCloudUser(null);state.records=[];renderAuth();toast('已登出')};
  $('#photoInput').addEventListener('change',e=>{window.bpPhotoFile=e.target.files[0]||null});
  $('#saveRecord').onclick=async()=>{
    const sys=+$('#sysInput').value,dia=+$('#diaInput').value,pulse=+$('#pulseInput').value;
    if(!sys||!dia||!pulse){toast('請確認三項數值都已填寫');return}
    if(!session){toast('目前尚未連線到雲端，請確認已設定 supabase-config.js');return}
    const btn=$('#saveRecord');btn.disabled=true;btn.textContent='儲存中…'; let photoPath=null;
    try{
      const file=window.bpPhotoFile;
      if(file){photoPath=`${session.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const upload=await client.storage.from('bp-photos').upload(photoPath,file,{contentType:file.type,upsert:false});if(upload.error)throw upload.error}
      const insert=await client.from('measurements').insert({user_id:session.user.id,systolic:sys,diastolic:dia,pulse,photo_path:photoPath}).select().single();
      if(insert.error)throw insert.error; await loadRecords(); closeModal(); renderAll(); toast('測量與照片已安全儲存');
    }catch(err){console.error(err);toast('儲存失敗：'+err.message)}finally{btn.disabled=false;btn.textContent='儲存這次測量'}
  };
  const originalOpen=window.openModal; window.openModal=function(){window.bpPhotoFile=null;originalOpen()};
  const {data}=await client.auth.getSession(); session=data.session; setCloudUser(session?.user||null); await loadRecords(); renderAuth();
})();
