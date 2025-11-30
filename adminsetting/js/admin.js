// adminsetting/js/admin.js

const videoForm   = document.getElementById('videoForm');
const videoIdEl   = document.getElementById('videoId');
const titleEl     = document.getElementById('title');
const descEl      = document.getElementById('description');
const videoUrlEl  = document.getElementById('videoUrl');
const thumbUrlEl  = document.getElementById('thumbUrl');
const durationEl  = document.getElementById('duration');
const resetBtn    = document.getElementById('resetBtn');

const tableBody   = document.getElementById('videoTableBody');
const historyBox  = document.getElementById('historyBox');

let videos = {};

function fmtDate(ts){
  if (!ts) return '-';
  return new Date(ts).toLocaleString('id-ID');
}
function fmtNumber(num){
  if (!num) return 0;
  if (num > 1_000_000) return (num/1_000_000).toFixed(1)+'M';
  if (num > 1_000) return (num/1_000).toFixed(1)+'K';
  return num;
}

/* ---------- HISTORY HELPERS ---------- */

function addHistory(videoId, type, note){
  const ref = db.ref(`videoHistory/${videoId}`).push();
  return ref.set({
    type,                      // created / updated / deleted
    note: note || '',
    at: Date.now()
  });
}

function loadHistory(videoId){
  historyBox.innerHTML =
    '<div style="font-size:.8rem;color:#9ca3af;">Memuat history...</div>';
  db.ref(`videoHistory/${videoId}`).once('value')
    .then(snap=>{
      const data = snap.val() || {};
      const arr = Object.values(data).sort((a,b)=>(a.at||0)-(b.at||0));

      if (!arr.length){
        historyBox.innerHTML =
          '<div style="font-size:.8rem;color:#9ca3af;">Belum ada history untuk video ini.</div>';
        return;
      }

      historyBox.innerHTML = '';
      arr.forEach(h=>{
        const wrap = document.createElement('div');
        wrap.className = 'history-item';

        const t = document.createElement('div');
        t.className = 'history-type';
        let label = '';
        if (h.type === 'created') label = 'Dibuat';
        else if (h.type === 'updated') label = 'Diedit';
        else if (h.type === 'deleted') label = 'Dihapus';
        else label = h.type;
        t.textContent = label;

        const meta = document.createElement('div');
        meta.className = 'history-meta';
        meta.textContent = fmtDate(h.at);

        const note = document.createElement('div');
        note.style.fontSize = '.75rem';
        note.textContent = h.note || '';

        wrap.appendChild(t);
        wrap.appendChild(meta);
        if (h.note) wrap.appendChild(note);

        historyBox.appendChild(wrap);
      });
    });
}

/* ---------- RENDER TABLE ---------- */

db.ref('videos').on('value', snap=>{
  videos = snap.val() || {};
  renderTable();
});

function renderTable(){
  tableBody.innerHTML = '';

  const entries = Object.entries(videos)
    .sort(([,a],[,b]) => (b.createdAt||0)-(a.createdAt||0));

  entries.forEach(([id,v])=>{
    const tr = document.createElement('tr');

    const tdTitle = document.createElement('td');
    tdTitle.innerHTML =
      `<strong>${v.title || '-'}</strong><br>
       <span style="font-size:.7rem;color:#9ca3af;">Durasi: ${v.duration||'-'}</span>`;

    const tdViews = document.createElement('td');
    tdViews.textContent = fmtNumber(v.views||0);

    const tdLikes = document.createElement('td');
    tdLikes.textContent = fmtNumber(v.likes||0);

    const tdComments = document.createElement('td');
    tdComments.textContent = v.commentsCount || 0;

    const tdCreated = document.createElement('td');
    tdCreated.textContent = fmtDate(v.createdAt);

    const tdUpdated = document.createElement('td');
    tdUpdated.textContent = fmtDate(v.updatedAt || v.createdAt);

    const tdActions = document.createElement('td');
    tdActions.className = 'actions-cell';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn ghost';
    btnEdit.textContent = 'Edit';
    btnEdit.onclick = ()=> loadToForm(id);

    const btnDel = document.createElement('button');
    btnDel.className = 'btn ghost';
    btnDel.style.borderColor = '#fb7185';
    btnDel.textContent = 'Hapus';
    btnDel.onclick = ()=> deleteVideo(id, v.title);

    const btnOpen = document.createElement('a');
    btnOpen.className = 'btn ghost';
    btnOpen.textContent = 'Lihat';
    const baseUrl = window.location.origin + '/Video/restroom/';
    btnOpen.href = `${baseUrl}?v=${encodeURIComponent(id)}`;
    btnOpen.target = '_blank';

    const btnHist = document.createElement('button');
    btnHist.className = 'btn ghost';
    btnHist.textContent = 'History';
    btnHist.onclick = ()=> loadHistory(id);

    tdActions.appendChild(btnEdit);
    tdActions.appendChild(btnDel);
    tdActions.appendChild(btnOpen);
    tdActions.appendChild(btnHist);

    tr.appendChild(tdTitle);
    tr.appendChild(tdViews);
    tr.appendChild(tdLikes);
    tr.appendChild(tdComments);
    tr.appendChild(tdCreated);
    tr.appendChild(tdUpdated);
    tr.appendChild(tdActions);

    tableBody.appendChild(tr);
  });

  if (!entries.length){
    tableBody.innerHTML =
      '<tr><td colspan="7" style="font-size:.8rem;color:#9ca3af;">Belum ada video. Tambah dari form di sebelah kiri.</td></tr>';
  }
}

/* ---------- FORM SUBMIT (CREATE / UPDATE) ---------- */

videoForm.addEventListener('submit', e=>{
  e.preventDefault();

  const id = videoIdEl.value || db.ref('videos').push().key;
  const now = Date.now();

  const prev = videos[id] || {};
  const data = {
    title: titleEl.value.trim(),
    description: descEl.value.trim(),
    videoUrl: videoUrlEl.value.trim(),
    thumbnailUrl: thumbUrlEl.value.trim(),
    duration: durationEl.value.trim(),
    views: prev.views || 0,
    likes: prev.likes || 0,
    commentsCount: prev.commentsCount || 0,
    createdAt: prev.createdAt || now,
    updatedAt: now
  };

  db.ref(`videos/${id}`).set(data)
    .then(()=>{
      const isNew = !prev.createdAt;
      return addHistory(id, isNew ? 'created' : 'updated',
        isNew ? 'Video diupload pertama kali' : 'Video diedit oleh admin');
    })
    .then(()=>{
      alert('Video disimpan ✔');
      clearForm();
    })
    .catch(err=>{
      console.error(err);
      alert('Gagal simpan video: '+err.message);
    });
});

function clearForm(){
  videoIdEl.value = '';
  titleEl.value = '';
  descEl.value = '';
  videoUrlEl.value = '';
  thumbUrlEl.value = '';
  durationEl.value = '';
}
resetBtn.addEventListener('click', clearForm);

/* ---------- LOAD DATA KE FORM ---------- */

function loadToForm(id){
  const v = videos[id];
  if (!v) return;
  videoIdEl.value   = id;
  titleEl.value     = v.title || '';
  descEl.value      = v.description || '';
  videoUrlEl.value  = v.videoUrl || '';
  thumbUrlEl.value  = v.thumbnailUrl || '';
  durationEl.value  = v.duration || '';

  window.scrollTo({top:0,behavior:'smooth'});
  loadHistory(id);
}

/* ---------- HAPUS VIDEO + KOMEN + HISTORY ---------- */

function deleteVideo(id, title){
  if (!confirm(`Hapus video "${title}" beserta komentar dan history?`)) return;

  // simpan event deleted dulu
  addHistory(id,'deleted','Video dihapus oleh admin')
    .then(()=>{
      const updates = {};
      updates[`videos/${id}`]   = null;
      updates[`comments/${id}`] = null;
      // history tetap disimpan, jadi tidak dihapus
      return db.ref().update(updates);
    })
    .then(()=>{
      alert('Video terhapus ✔ (history tetap tersimpan)');
      if (videoIdEl.value === id) clearForm();
      historyBox.innerHTML =
        'Video sudah dihapus. Pilih video lain untuk melihat history.';
    })
    .catch(err=>{
      console.error(err);
      alert('Gagal hapus: '+err.message);
    });
}

