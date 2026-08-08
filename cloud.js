// Supabase connection and family-member sign-in for the GitHub Pages site.
(async function(){
  const cfg=window.SUPABASE_CONFIG;
  const clientKey=cfg?.publishableKey||cfg?.anonKey;
  if(!cfg || !cfg.url || cfg.url.includes('YOUR-PROJECT') || !clientKey || !window.supabase) return;

  const client=window.supabase.createClient(cfg.url,clientKey);
  const members={
    admin:{name:'管理員 k5star',email:'bp-admin@family-bp.local'},
    dad:{name:'爸爸',email:'bp-dad@family-bp.local'},
    mom:{name:'媽媽',email:'bp-mom@family-bp.local'},
    brother:{name:'哥哥',email:'bp-brother@family-bp.local'},
    'sister-in-law':{name:'哥哥老婆',email:'bp-sister-in-law@family-bp.local'},
    'child-1':{name:'老大',email:'bp-child-1@family-bp.local'},
    'child-2':{name:'老二',email:'bp-child-2@family-bp.local'},
    'child-3':{name:'老三',email:'bp-child-3@family-bp.local'},
    'child-4':{name:'老四',email:'bp-child-4@family-bp.local'}
  };
  let session=null;
  let setupMode=false;
  window.bpPhotoFile=null;

  const currentMember=()=>members[$('#memberInput').value];
  function setCloudUser(user){
    state.user=user?{id:user.id,name:user.user_metadata?.name||currentMember().name,email:user.email}:null;
  }
  function updateAuthUI(){
    const member=currentMember();
    $('#emailInput').value=member.email;
    $('#authTitle').textContent=setupMode?`設定 ${member.name} 的密碼`:`${member.name}，歡迎回來`;
    $('#authSubtitle').textContent=setupMode?'第一次使用時，設定一組專屬密碼。':'選擇家人並輸入專屬密碼。';
    $('#confirmPasswordField').classList.toggle('hidden',!setupMode);
    $('#authSubmit').textContent=setupMode?'設定並登入':'登入';
    $('#setupMemberBtn').innerHTML=setupMode?'已設定過密碼？ <strong>返回登入</strong>':'第一次使用此成員？ <strong>設定密碼</strong>';
    $('#passwordInput').value=''; $('#confirmPasswordInput').value='';
  }
  async function loadRecords(){
    if(!session){state.records=[];return}
    const {data,error}=await client.from('bp_measurements').select('*').order('measured_at',{ascending:false});
    if(error){console.error(error);toast('讀取雲端紀錄失敗');return}
    state.records=(data||[]).map(r=>({id:r.id,userId:r.user_id,memberName:r.member_name,date:r.measured_at,sys:r.systolic,dia:r.diastolic,pulse:r.pulse,photoPath:r.photo_path}));
  }

  $('#memberInput').onchange=()=>{setupMode=false;updateAuthUI()};
  $('#setupMemberBtn').onclick=()=>{setupMode=!setupMode;updateAuthUI()};
  $('#authForm').onsubmit=async e=>{
    e.preventDefault();
    const member=currentMember();
    const password=$('#passwordInput').value;
    const confirm=$('#confirmPasswordInput').value;
    if(password.length<6){toast('密碼至少需要 6 個字元');return}
    if(setupMode&&password!==confirm){toast('兩次輸入的密碼不同');return}

    const result=setupMode
      ?await client.auth.signUp({email:member.email,password,options:{data:{name:member.name,family_member:$('#memberInput').value}}})
      :await client.auth.signInWithPassword({email:member.email,password});
    if(result.error){
      const message=result.error.message;
      toast(message.includes('already registered')?'此成員已設定密碼，請改用登入。':message.includes('email rate limit')?'帳號建立太頻繁，請先在 Supabase 關閉 Email confirmation，稍後再試。':message.includes('Invalid login')?'密碼不正確':'無法登入：'+message);
      return;
    }
    session=result.data.session;
    if(!session){toast('已建立帳號；請到 Supabase 關閉 Email confirmation 後再登入。');return}
    setCloudUser(session.user); await loadRecords(); renderAuth(); toast(`${member.name}，登入成功`);
  };
  $('#logoutBtn').onclick=async()=>{await client.auth.signOut();session=null;setCloudUser(null);state.records=[];renderAuth();updateAuthUI();toast('已登出')};
  $('#photoInput').addEventListener('change',e=>{window.bpPhotoFile=e.target.files[0]||null});
  $('#saveRecord').onclick=async()=>{
    const sys=+$('#sysInput').value,dia=+$('#diaInput').value,pulse=+$('#pulseInput').value;
    if(!sys||!dia||!pulse){toast('請確認三項數值都已填寫');return}
    if(!session){toast('請先登入');return}
    const btn=$('#saveRecord');btn.disabled=true;btn.textContent='儲存中…';let photoPath=null;
    try{
      const file=window.bpPhotoFile;
      if(file){photoPath=`${session.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const upload=await client.storage.from('blood-pressure-photos').upload(photoPath,file,{contentType:file.type,upsert:false});if(upload.error)throw upload.error}
      const insert=await client.from('bp_measurements').insert({user_id:session.user.id,member_name:state.user.name,systolic:sys,diastolic:dia,pulse,photo_path:photoPath}).select().single();
      if(insert.error)throw insert.error;await loadRecords();closeModal();renderAll();toast('測量與照片已儲存');
    }catch(err){console.error(err);toast('儲存失敗：'+err.message)}finally{btn.disabled=false;btn.textContent='儲存這次測量'}
  };
  const originalOpen=window.openModal;window.openModal=function(){window.bpPhotoFile=null;originalOpen()};
  const {data}=await client.auth.getSession();session=data.session;setCloudUser(session?.user||null);await loadRecords();updateAuthUI();renderAuth();
})();
