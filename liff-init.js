// Runs only when the site is opened through the configured LINE LIFF app.
window.LIFF_APP_ID = '2011021988-mY1HknbU';
window.liffState = { ready: false, inClient: false };

(async function(){
  if(!window.liff) return;
  try {
    await liff.init({ liffId: window.LIFF_APP_ID });
    window.liffState = { ready: true, inClient: liff.isInClient() };
  } catch (error) {
    console.warn('LIFF initialization skipped', error);
  }
})();
