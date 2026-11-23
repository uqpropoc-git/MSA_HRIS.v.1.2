async function apiPost(action, data = {}) {
  const response = await fetch(APP_CONFIG.API_URL, {
    method: 'POST',
    headers: {'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify(Object.assign({action}, data))
  });
  return await response.json();
}

async function apiGet(action, params = {}) {
  const query = new URLSearchParams(Object.assign({action}, params));
  const response = await fetch(APP_CONFIG.API_URL + '?' + query.toString());
  return await response.json();
}

function humanError(message) {
  const map = {
    'USERNAME_PASSWORD_SALAH':'Username atau password salah.',
    'SESSION_EXPIRED':'Sesi telah berakhir. Silakan login kembali.',
    'FORBIDDEN':'Anda tidak memiliki akses untuk tindakan ini.',
    'SESSION_REQUIRED':'Sesi login diperlukan.',
    'Saldo cuti tidak mencukupi.':'Saldo cuti tidak mencukupi.'
  };
  return map[message] || message || 'Terjadi kesalahan.';
}
