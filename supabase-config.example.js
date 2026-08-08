// 複製成 supabase-config.js 後，填入 Supabase 專案資訊。
// 這個 anon key 可以放在前端；資料安全要靠 SQL 裡的 RLS 規則。
window.SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
