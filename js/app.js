if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.error);
}

function setNetworkStatus() {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.textContent = navigator.onLine ? '● Online' : '● Offline';
  el.className = navigator.onLine ? 'status-pill online' : 'status-pill offline';
}
addEventListener('online', setNetworkStatus);
addEventListener('offline', setNetworkStatus);
setNetworkStatus();
