let deferredInstallPrompt;
const installAppBtn=document.querySelector('#installAppBtn');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt=event;
  installAppBtn?.classList.remove('hidden');
});

installAppBtn?.addEventListener('click', async () => {
  if(!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null;
  installAppBtn.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt=null;
  installAppBtn?.classList.add('hidden');
});
