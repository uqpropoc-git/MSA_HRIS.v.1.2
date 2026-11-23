let S = getSession(), employees = [], leaves = [], holidays = [];

const $ = s => document.querySelector(s);

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[c]));

function toast(m, e = false) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = m;
  t.className = 'toast show' + (e ? ' error' : '');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    t.className = 'toast';
  }, 2500);
}

function modal(t, b) {
  $('#mt').textContent = t;
  $('#mb').innerHTML = b;
  $('#modal').classList.remove('hidden');
}

function closeModal() {
  $('#modal').classList.add('hidden');
}

function forceRelogin(message = 'Sesi telah berakhir. Silakan login kembali.') {
  clearSession();
  toast(humanError(message), true);
  setTimeout(() => {
    location.replace('login.html');
  }, 400);
}

function isSessionError(msg) {
  return ['SESSION_EXPIRED', 'SESSION_REQUIRED'].includes(String(msg || '').toUpperCase());
}

function badge(s) {
  const m = {
    APPROVED: ['Disetujui', 'green'],
    WAITING_KABAG: ['Menunggu Kabag', 'amber'],
    WAITING_HRD: ['Menunggu HRD', 'blue'],
    REJECTED_KABAG: ['Ditolak Kabag', 'red'],
    REJECTED_HRD: ['Ditolak HRD', 'red']
  };
  const x = m[s] || [s || '-', 'gray'];
  return `<span class="badge ${x[1]}">${esc(x[0])}</span>`;
}

function date(v) {
  if (!v) return '-';
  const d = new Date(String(v).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return esc(v);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

async function get(a, p = {}) {
  const currentSession = getSession();
  if (!currentSession || !currentSession.token) {
    forceRelogin('SESSION_REQUIRED');
    throw new Error('Sesi login diperlukan.');
  }
  const r = await apiGet(a, Object.assign({ token: currentSession.token }, p));
  if (!r || !r.success) {
    const errMsg = (r && r.message) || 'Gagal mengambil data.';
    if (isSessionError(errMsg)) {
      forceRelogin(errMsg);
    }
    throw new Error(humanError(errMsg));
  }
  return r.data;
}

async function post(a, p = {}) {
  const currentSession = getSession();
  if (!currentSession || !currentSession.token) {
    forceRelogin('SESSION_REQUIRED');
    throw new Error('Sesi login diperlukan.');
  }
  const r = await apiPost(a, Object.assign({ token: currentSession.token }, p));
  if (!r || !r.success) {
    const errMsg = (r && r.message) || 'Gagal memproses permintaan.';
    if (isSessionError(errMsg)) {
      forceRelogin(errMsg);
    }
    throw new Error(humanError(errMsg));
  }
  return r.data;
}

async function load() {
  const results = await Promise.allSettled([
    get('employees'),
    get('leaveRequests'),
    get('holidays')
  ]);

  if (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) {
    employees = results[0].value;
  }
  if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
    leaves = results[1].value;
  }
  if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) {
    holidays = results[2].value;
  }

  const errors = results
    .filter(x => x.status === 'rejected')
    .map(x => x.reason?.message || 'Kesalahan memuat data');

  if (errors.length && !errors.some(m => m.includes('Sesi'))) {
    toast(errors[0], true);
  }
}

async function nav(p) {
  const titles = {
    dashboard: 'Dashboard',
    employees: 'Data Karyawan',
    leave: 'Pengajuan Cuti',
    approval: 'Approval Cuti',
    holidays: 'Hari Libur & Cuti Bersama',
    documents: 'Arsip Surat Penetapan Cuti'
  };
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.page === p));
  $('#title').textContent = titles[p] || 'Dashboard';

  try {
    if (p === 'dashboard') await dash();
    else if (p === 'employees') emp();
    else if (p === 'leave') leave();
    else if (p === 'approval') approval();
    else if (p === 'holidays') holiday();
    else if (p === 'documents') await docs();
    else await dash();
  } catch (e) {
    toast(e.message || 'Gagal membuka halaman.', true);
    $('#page').innerHTML = `<div class="panel"><h3>Gagal memuat halaman</h3><p class="muted">${esc(e.message || 'Terjadi kesalahan.')}</p><button class="btn primary" onclick="nav('${esc(p)}')">Coba Lagi</button></div>`;
  }
}

async function dash() {
  $('#page').innerHTML = `<div class="panel"><p class="muted">Memuat ringkasan dashboard...</p></div>`;
  try {
    const d = await get('dashboard');
    if (!d) return;
    $('#page').innerHTML = `
      <div class="cards">
        <div class="stat"><span>Total Karyawan</span><b>${esc(d.totalEmployees ?? 0)}</b></div>
        <div class="stat"><span>Pending Kabag</span><b>${esc(d.pendingKabag ?? 0)}</b></div>
        <div class="stat"><span>Pending HRD</span><b>${esc(d.pendingHrd ?? 0)}</b></div>
        <div class="stat"><span>Cuti Bulan Ini</span><b>${esc(d.leaveThisMonth ?? 0)}</b></div>
      </div>
      <div class="panel">
        <h3>Workflow Cuti</h3>
        <div class="workflow">
          <div><span>1</span><b>Karyawan</b><small>Ajukan</small></div>
          <div class="arrow">→</div>
          <div><span>2</span><b>Kabag</b><small>Approve</small></div>
          <div class="arrow">→</div>
          <div><span>3</span><b>HRD Jakarta</b><small>Final</small></div>
          <div class="arrow">→</div>
          <div><span>4</span><b>PDF</b><small>Arsip Drive</small></div>
        </div>
      </div>
    `;
  } catch (e) {
    $('#page').innerHTML = `
      <div class="panel">
        <h3>Data Dashboard Belum Dapat Dimuat</h3>
        <p class="muted">${esc(e.message || 'Periksa koneksi atau status server.')}</p>
        <button class="btn primary" onclick="dash()">Muat Ulang</button>
      </div>
    `;
  }
}

function f(l, k, v = '', r = false, t = 'text') {
  return `<label class="field"><span>${esc(l)}</span><input type="${esc(t)}" name="${esc(k)}" value="${esc(v)}" ${r ? 'required' : ''}></label>`;
}

function n(l, k, v) {
  return f(l, k, v, false, 'number');
}

function emp() {
  const role = S?.user?.role || '';
  if (!['ADMIN', 'HRD'].includes(role)) {
    $('#page').innerHTML = '<div class="panel">Akses hanya Admin/HRD.</div>';
    return;
  }
  $('#page').innerHTML = `
    <div class="toolbar">
      <input id="q" placeholder="Cari NIK, nama, jabatan">
      <button class="btn primary" onclick="empForm()">+ Tambah</button>
    </div>
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>NIK</th><th>Nama</th><th>Jabatan</th><th>Departemen</th><th>Saldo</th><th></th></tr></thead>
        <tbody id="er"></tbody>
      </table>
    </div>
  `;
  drawEmp(employees);
  $('#q').oninput = e => {
    const q = e.target.value.toLowerCase();
    drawEmp(employees.filter(x => (
      `${x.nik || ''} ${x.name || ''} ${x.position || ''} ${x.department || ''}`
    ).toLowerCase().includes(q)));
  };
}

function drawEmp(a) {
  $('#er').innerHTML = a.map(e => `
    <tr>
      <td>${esc(e.nik)}</td>
      <td><b>${esc(e.name)}</b></td>
      <td>${esc(e.position)}</td>
      <td>${esc(e.department)}</td>
      <td><b>${Number(e.remaining_leave || 0)}</b> hari</td>
      <td><button class="btn tiny" onclick="empForm('${esc(e.employee_id)}')">Edit</button></td>
    </tr>
  `).join('') || '<tr><td colspan="6">Belum ada data.</td></tr>';
}

function empForm(id) {
  const e = employees.find(x => x.employee_id === id) || {};
  modal(
    id ? 'Edit Karyawan' : 'Tambah Karyawan',
    `<form id="ef" class="form-grid">
      ${f('NIK', 'nik', e.nik, true)}
      ${f('Nama', 'name', e.name, true)}
      ${f('Jabatan', 'position', e.position, true)}
      ${f('Departemen', 'department', e.department, true)}
      ${f('Tempat Tugas', 'work_location', e.work_location)}
      ${n('Cuti Tahun Berjalan', 'annual_leave', e.annual_leave ?? 12)}
      ${n('Sisa Cuti Tahun Lalu', 'previous_leave', e.previous_leave ?? 0)}
      ${n('Potongan Izin', 'permission_deduction', e.permission_deduction ?? 0)}
      ${n('Tambahan Overtime', 'overtime_leave', e.overtime_leave ?? 0)}
      ${n('Cuti Terpakai', 'used_leave', e.used_leave ?? 0)}
      ${f('Email', 'email', e.email)}
      ${f('No. HP', 'phone', e.phone)}
      <div class="modal-actions">
        <button type="button" class="btn ghost" onclick="closeModal()">Batal</button>
        <button class="btn primary" type="submit">Simpan</button>
      </div>
    </form>`
  );

  $('#ef').onsubmit = async ev => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    const d = Object.fromEntries(new FormData(ev.target));
    ['annual_leave', 'previous_leave', 'permission_deduction', 'overtime_leave', 'used_leave'].forEach(k => {
      d[k] = Number(d[k] || 0);
    });
    try {
      await post(id ? 'employeeUpdate' : 'employeeCreate', {
        data: id ? Object.assign({ employee_id: id }, d) : d
      });
      closeModal();
      await load();
      emp();
      toast('Data tersimpan.');
    } catch (err) {
      toast(err.message, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  };
}

function leave() {
  $('#page').innerHTML = `
    <div class="toolbar">
      <div><h3>Pengajuan Cuti</h3><p class="muted">Cuti bersama tidak memotong cuti tahunan.</p></div>
      <button class="btn primary" onclick="leaveForm()">+ Ajukan Cuti</button>
    </div>
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>Periode</th><th>Jenis</th><th>Hari</th><th>Status</th><th>Nomor Surat</th></tr></thead>
        <tbody>
          ${leaves.map(l => `
            <tr>
              <td>${date(l.start_date)} — ${date(l.end_date)}</td>
              <td>${esc(l.leave_type)}</td>
              <td>${esc(l.total_days)}</td>
              <td>${badge(l.status)}</td>
              <td>${esc(l.document_number || '-')}</td>
            </tr>
          `).join('') || '<tr><td colspan="5">Belum ada pengajuan.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function leaveForm() {
  const opts = employees.map(e => `<option value="${esc(e.employee_id)}">${esc(e.name)} — ${esc(e.nik)}</option>`).join('');
  const isK = S?.user?.role === 'KARYAWAN';
  modal(
    'Ajukan Cuti',
    `<form id="lf">
      ${isK ? '' : `<label class="field"><span>Karyawan</span><select name="employee_id">${opts}</select></label>`}
      <label class="field"><span>Jenis Cuti</span>
        <select name="leave_type">
          <option>Cuti Tahunan</option>
          <option>Cuti Bersama</option>
          <option>Izin</option>
          <option>Cuti Khusus</option>
        </select>
      </label>
      ${f('Tanggal Mulai', 'start_date', '', true, 'date')}
      ${f('Tanggal Selesai', 'end_date', '', true, 'date')}
      ${f('Alasan', 'reason')}
      <div class="info-box">Hari kerja dan saldo diverifikasi server.</div>
      <div class="modal-actions"><button class="btn primary" type="submit">Kirim</button></div>
    </form>`
  );

  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    const d = Object.fromEntries(new FormData(e.target));
    try {
      if (!navigator.onLine && typeof queueAdd === 'function') {
        await queueAdd('leaveSubmit', d);
        closeModal();
        toast('Tersimpan offline.');
        return;
      }
      await post('leaveSubmit', { data: d });
      closeModal();
      await load();
      leave();
      toast('Pengajuan terkirim.');
    } catch (x) {
      toast(x.message, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  };
}

function approval() {
  const role = S?.user?.role || '';
  if (!['KABAG', 'HRD', 'ADMIN'].includes(role)) {
    $('#page').innerHTML = '<div class="panel">Tidak ada approval untuk role ini.</div>';
    return;
  }
  const a = leaves.filter(x => role === 'KABAG' ? x.status === 'WAITING_KABAG' : x.status === 'WAITING_HRD');
  $('#page').innerHTML = `
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>Karyawan</th><th>Jenis</th><th>Periode</th><th>Hari</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${a.map(l => {
            const e = employees.find(x => x.employee_id === l.employee_id) || {};
            return `
              <tr>
                <td>${esc(e.name || l.employee_id)}</td>
                <td>${esc(l.leave_type)}</td>
                <td>${date(l.start_date)} — ${date(l.end_date)}</td>
                <td>${esc(l.total_days)}</td>
                <td>${badge(l.status)}</td>
                <td><button class="btn tiny primary" onclick="review('${esc(l.leave_id)}')">Review</button></td>
              </tr>
            `;
          }).join('') || '<tr><td colspan="6">Tidak ada antrian.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function review(id) {
  const l = leaves.find(x => x.leave_id === id) || {};
  const e = employees.find(x => x.employee_id === l.employee_id) || {};
  const role = S?.user?.role || '';
  modal(
    'Review Pengajuan',
    `<div class="detail-grid">
      <div><span>Karyawan</span><b>${esc(e.name || l.employee_id)}</b></div>
      <div><span>Departemen</span><b>${esc(e.department || '-')}</b></div>
      <div><span>Jenis</span><b>${esc(l.leave_type)}</b></div>
      <div><span>Periode</span><b>${date(l.start_date)} — ${date(l.end_date)}</b></div>
      <div><span>Jumlah</span><b>${esc(l.total_days)} hari</b></div>
      <div><span>Alasan</span><b>${esc(l.reason || '-')}</b></div>
    </div>
    <label class="field"><span>Catatan</span><textarea id="note"></textarea></label>
    <div class="modal-actions">
      <button class="btn danger" onclick="approve('${esc(id)}','reject')">Tolak</button>
      ${role === 'KABAG'
        ? `<button class="btn primary" onclick="approve('${esc(id)}','kabag')">Approve Kabag</button>`
        : `<button class="btn primary" onclick="approve('${esc(id)}','hrd')">Approve & Terbitkan Surat</button>`}
    </div>`
  );
}

async function approve(id, t) {
  try {
    const actionMap = {
      reject: 'leaveReject',
      kabag: 'leaveApproveKabag',
      hrd: 'leaveApproveHRD'
    };
    await post(actionMap[t] || 'leaveApproveHRD', {
      leave_id: id,
      note: $('#note') ? $('#note').value : ''
    });
    closeModal();
    await load();
    approval();
    toast('Proses berhasil.');
  } catch (e) {
    toast(e.message, true);
  }
}

function holiday() {
  const can = ['ADMIN', 'HRD'].includes(S?.user?.role || '');
  $('#page').innerHTML = `
    <div class="toolbar">
      <div><h3>Hari Libur</h3><p class="muted">Cuti bersama tidak memotong cuti tahunan.</p></div>
      ${can ? '<button class="btn primary" onclick="holidayForm()">+ Tambah</button>' : ''}
    </div>
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>Tanggal</th><th>Nama</th><th>Jenis</th><th>Keterangan</th></tr></thead>
        <tbody>
          ${holidays.map(h => `
            <tr>
              <td>${date(h.date)}</td>
              <td>${esc(h.name)}</td>
              <td>${esc(h.type)}</td>
              <td>${esc(h.description)}</td>
            </tr>
          `).join('') || '<tr><td colspan="4">Belum ada.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function holidayForm() {
  modal(
    'Tambah Hari Libur',
    `<form id="hf">
      ${f('Tanggal', 'date', '', true, 'date')}
      ${f('Nama', 'name', '', true)}
      <label class="field"><span>Jenis</span>
        <select name="type">
          <option value="NATIONAL_HOLIDAY">Hari Libur Nasional</option>
          <option value="COLLECTIVE_LEAVE">Cuti Bersama</option>
        </select>
      </label>
      ${f('Keterangan', 'description')}
      <div class="modal-actions"><button class="btn primary" type="submit">Simpan</button></div>
    </form>`
  );

  $('#hf').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      await post('holidayCreate', { data: Object.fromEntries(new FormData(e.target)) });
      closeModal();
      holidays = await get('holidays');
      holiday();
      toast('Tersimpan.');
    } catch (x) {
      toast(x.message, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  };
}

async function docs() {
  const role = S?.user?.role || '';
  if (!['ADMIN', 'HRD'].includes(role)) {
    $('#page').innerHTML = '<div class="panel">Akses hanya HRD/Admin.</div>';
    return;
  }
  $('#page').innerHTML = '<div class="panel"><p class="muted">Memuat arsip dokumen...</p></div>';
  const d = await get('documents');
  $('#page').innerHTML = `
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>Nomor</th><th>Tahun</th><th>Bulan</th><th>PDF</th></tr></thead>
        <tbody>
          ${(d || []).map(x => `
            <tr>
              <td>${esc(x.document_number)}</td>
              <td>${esc(x.year)}</td>
              <td>${esc(x.month)}</td>
              <td><a class="btn tiny" target="_blank" rel="noopener noreferrer" href="${esc(x.file_url)}">Buka PDF</a></td>
            </tr>
          `).join('') || '<tr><td colspan="4">Belum ada dokumen.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

async function syncQueue() {
  if (!navigator.onLine || typeof queueAll !== 'function' || typeof queueDelete !== 'function') return;
  const items = await queueAll();
  if (!items || !items.length) return;
  try {
    const r = await apiPost('syncQueue', { token: S?.token, items });
    if (r && isSessionError(r.message)) {
      forceRelogin(r.message);
      return;
    }
    for (const x of r?.results || []) {
      if (x.success) await queueDelete(x.client_id);
    }
    if ((r?.results || []).some(x => x.success)) {
      await load();
      toast('Antrian offline tersinkron.');
    }
  } catch (_) {}
}

function updateTopNetStatus() {
  const el = $('#net');
  if (!el) return;
  const online = navigator.onLine;
  el.textContent = online ? '● Online' : '● Offline';
  el.className = 'status-pill ' + (online ? 'online' : 'offline');
}

document.addEventListener('DOMContentLoaded', async () => {
  S = requireLogin();
  if (!S) return;

  $('#user').innerHTML = `<b>${esc(S.user?.name || 'Pengguna')}</b><br><small>${esc(S.user?.role || '-')}</small>`;
  $('#logout').onclick = () => {
    clearSession();
    location.replace('login.html');
  };

  document.querySelectorAll('#nav a').forEach(a => {
    a.onclick = ev => {
      ev.preventDefault();
      nav(a.dataset.page);
    };
  });

  addEventListener('online', () => {
    updateTopNetStatus();
    syncQueue();
  });
  addEventListener('offline', updateTopNetStatus);
  updateTopNetStatus();

  await nav('dashboard');
  await load();
  if (document.querySelector('#nav a.active')?.dataset.page !== 'dashboard') {
    nav(document.querySelector('#nav a.active').dataset.page);
  }
  if (navigator.onLine) await syncQueue();
});
