document.addEventListener('DOMContentLoaded', async function(){
  const session = requireLogin();
  if (!session) return;

  document.getElementById('userInfo').innerHTML =
    '<b>' + escapeHtml(session.user.name) + '</b><br><small>' + escapeHtml(session.user.role) + '</small>';

  document.getElementById('logoutBtn').addEventListener('click', async function(){
    try { await apiPost('logout',{token:session.token}); } catch(e){}
    clearSession();
    location.href='login.html';
  });

  try {
    const r = await apiGet('dashboard',{token:session.token});
    if (r.success) {
      document.getElementById('totalEmployees').textContent = r.data.totalEmployees;
      document.getElementById('pendingKabag').textContent = r.data.pendingKabag;
      document.getElementById('pendingHrd').textContent = r.data.pendingHrd;
      document.getElementById('leaveThisMonth').textContent = r.data.leaveThisMonth;
    }
  } catch(e) {}

  document.querySelectorAll('[data-page]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      alert('Modul ' + this.dataset.page + ' akan dimuat pada tahap berikutnya.');
    });
  });
});

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}
