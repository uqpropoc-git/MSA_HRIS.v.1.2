const SESSION_KEY = 'MSA_HRIS_SESSION';

function saveSession(result) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    token: result.token,
    user: result.user
  }));
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch(e){ return null; }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function requireLogin() {
  const s = getSession();
  if (!s || !s.token) {
    location.href = 'login.html';
    return null;
  }
  return s;
}
