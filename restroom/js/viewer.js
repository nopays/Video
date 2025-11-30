// restroom/js/viewer.js

let videos = {};
let currentVideoId = null;
let commentsRef = null;
let viewIncrementedFor = null;

const videoListEl   = document.getElementById('videoList');
const searchInput   = document.getElementById('searchInput');

const playerTitle   = document.getElementById('playerTitle');
const playerDesc    = document.getElementById('playerDesc');
const playerThumb   = document.getElementById('playerThumb');
const metaLine      = document.getElementById('metaLine');
const videoFrameWrap= document.getElementById('videoFrameWrap');

const statViews     = document.getElementById('statViews');
const statLikes     = document.getElementById('statLikes');
const statComments  = document.getElementById('statComments');

const playBtn       = document.getElementById('playBtn');
const likeBtn       = document.getElementById('likeBtn');

const commentList   = document.getElementById('commentList');
const commentForm   = document.getElementById('commentForm');
const commentName   = document.getElementById('commentName');
const commentText   = document.getElementById('commentText');

const shareWhatsapp = document.getElementById('shareWhatsapp');
const shareTelegram = document.getElementById('shareTelegram');
const shareFacebook = document.getElementById('shareFacebook');
const shareTwitter  = document.getElementById('shareTwitter');
const shareCopy     = document.getElementById('shareCopy');

const lastWatchedBox= document.getElementById('lastWatchedBox');

const LAST_WATCHED_KEY = 'dkplay.lastWatched';

/* ----------------- helpers ----------------- */

function cE(tag, cls, text){
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text) el.textContent = text;
  return el;
}

function fmtNumber(num){
  if (!num) return 0;
  if (num > 1_000_000) return (num/1_000_000).toFixed(1)+'M';
  if (num > 1_000) return (num/1_000).toFixed(1)+'K';
  return num;
}
function fmtDate(ts){
  if (!ts) return '-';
  return new Date(ts).toLocaleString('id-ID');
}

/* ----------------- share link ----------------- */

function updateShareLinks(videoId, video){
  const baseUrl = window.location.origin + window.location.pathname;
  const videoUrl = `${baseUrl}?v=${encodeURIComponent(videoId)}`;

  const text = encodeURIComponent(`Nonton "${video.title}" di DKPlay`);
  const shareUrl = encodeURIComponent(videoUrl);

  shareWhatsapp.href = `https://api.whatsapp.com/send?text=${text}%20${shareUrl}`;
  shareTelegram.href = `https://t.me/share/url?url=${shareUrl}&text=${text}`;
  shareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
  shareTwitter.href  = `https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}`;

  shareCopy.onclick = () => {
    navigator.clipboard.writeText(videoUrl)
      .then(()=> alert('Link video disalin ✔'))
      .catch(()=> alert('Gagal menyalin link'));
  };
}

/* ----------------- render video list ----------------- */

function renderVideoList(filter=''){
  videoListEl.innerHTML = '';
  const term = filter.trim().toLowerCase();

  Object.entries(videos).forEach(([id, v])=>{
    if (term && !v.title.toLowerCase().includes(term)) return;

    const card = cE('div','video-card');
    card.dataset.id = id;

    const tWrap = cE('div','video-thumb');
    const img = new Image();
    img.src = v.thumbnailUrl || 'https://i.imgur.com/E8GUx7G.jpeg';
    img.alt = v.title;
    const badge = cE('div','badge', v.duration || 'K-Drama');
    const badge2 = cE('div','badge badge-right', fmtNumber(v.views||0)+' views');
    tWrap.appendChild(img);
    tWrap.appendChild(badge);
    tWrap.appendChild(badge2);

    const meta = cE('div','video-meta');
    const t = cE('div','video-title', v.title);
    const stats = cE('div','video-stats',
      `${fmtNumber(v.likes||0)} likes · ${(v.commentsCount||0)} komentar`);
    meta.appendChild(t);
    meta.appendChild(stats);

    card.appendChild(tWrap);
    card.appendChild(meta);

    card.addEventListener('click', ()=> selectVideo(id));

    videoListEl.appendChild(card);
  });
}

/* ----------------- pilih video ----------------- */

function detachCommentsListener(){
  if (commentsRef){
    commentsRef.off();
    commentsRef = null;
  }
}

function selectVideo(id){
  const v = videos[id];
  if (!v) return;

  currentVideoId = id;
  playerTitle.textContent = v.title;
  playerDesc.textContent  = v.description || 'Drama Korea pilihan malam ini.';
  statViews.textContent   = `${fmtNumber(v.views||0)} views`;
  statLikes.textContent   = `${fmtNumber(v.likes||0)} likes`;
  statComments.textContent= `${v.commentsCount||0} komentar`;

  metaLine.textContent =
    `Diupload: ${fmtDate(v.createdAt)} • Terakhir edit: ${fmtDate(v.updatedAt||v.createdAt)}`;

  playerThumb.innerHTML =
    `<img src="${v.thumbnailUrl || 'https://i.imgur.com/E8GUx7G.jpeg'}"
           alt="${v.title}" style="width:100%;border-radius:12px;">`;

  // setiap kali pilih video baru: tunjuk thumbnail, sembunyikan player
  playerThumb.style.display   = 'block';
  videoFrameWrap.innerHTML    = '';
  videoFrameWrap.hidden       = true;
  videoFrameWrap.style.display= 'none';

  viewIncrementedFor = null;

  updateShareLinks(id, v);
  listenComments(id);
}

/* ----------------- play & view counter ----------------- */

function openVideoFrame(v){
  if (!v) return;

  let url = v.videoUrl || "";
  if (!url) return;

  // ---- Normalisasi link YouTube (watch / youtu.be -> embed) ----
  try {
    if (url.includes("youtube.com/watch")) {
      const u = new URL(url);
      const id = u.searchParams.get("v");
      if (id) url = `https://www.youtube.com/embed/${id}`;
    } else if (url.includes("youtu.be/")) {
      const part = url.split("youtu.be/")[1] || "";
      const id = part.split(/[?&]/)[0];
      if (id) url = `https://www.youtube.com/embed/${id}`;
    }
  } catch (e) {
    console.warn("Gagal parse URL video", e);
  }

  console.log("Playing video URL:", url);

  // ---- Sembunyikan thumbnail, tampilkan kotak player ----
  playerThumb.style.display    = 'none';
  videoFrameWrap.hidden        = false;
  videoFrameWrap.style.display = 'block';
  videoFrameWrap.innerHTML     = "";

  // ---- Jika YouTube -> pakai iframe ----
  if (url.includes("youtube.com")) {
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.setAttribute("allowfullscreen", "true");
    iframe.style.width  = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    videoFrameWrap.appendChild(iframe);
  } else {
    // Selain YouTube -> anggap MP4 / stream biasa
    const vid = document.createElement("video");
    vid.src = url;
    vid.controls = true;
    vid.autoplay = true;
    vid.style.width  = "100%";
    vid.style.height = "100%";
    videoFrameWrap.appendChild(vid);
  }
}

  // ===============================
  //  MODAL FULLSCREEN UNTUK PLAYER
  // ===============================

  // Hapus modal lama kalau ada
  const old = document.getElementById("dk-video-modal");
  if (old) old.remove();

  // Overlay gelap
  const overlay = document.createElement("div");
  overlay.id = "dk-video-modal";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.85)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";

  // Kotak player
  const box = document.createElement("div");
  box.style.position = "relative";
  box.style.width = "90%";
  box.style.maxWidth = "900px";
  box.style.aspectRatio = "16 / 9";
  box.style.background = "#000";
  box.style.borderRadius = "16px";
  box.style.overflow = "hidden";
  box.style.boxShadow = "0 20px 60px rgba(0,0,0,0.6)";

  // Tombol close
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "8px";
  closeBtn.style.right = "12px";
  closeBtn.style.zIndex = "2";
  closeBtn.style.border = "none";
  closeBtn.style.background = "rgba(0,0,0,0.6)";
  closeBtn.style.color = "#fff";
  closeBtn.style.padding = "4px 10px";
  closeBtn.style.borderRadius = "999px";
  closeBtn.style.cursor = "pointer";
  closeBtn.onclick = () => overlay.remove();
  box.appendChild(closeBtn);

  // Buat iframe YouTube atau video MP4
  if (url.includes("youtube.com")) {
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.setAttribute("allowfullscreen", "true");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    box.appendChild(iframe);
  } else {
// --- HTML5 VIDEO (MP4 / direct link) ---
const vid = document.createElement("video");
vid.src = url;
vid.controls = true;
vid.autoplay = true;
vid.style.width = "100%";
vid.style.height = "100%";
box.appendChild(vid);

// ================
// DOUBLE TAP SKIP
// ================
let skipAmount = 5;
let lastTap = 0;

vid.addEventListener("click", () => {
  const now = Date.now();

  // cek double tap (<= 300ms)
  if (now - lastTap < 300) {
    // jalankan skip
    vid.currentTime = Math.min(vid.duration, vid.currentTime + skipAmount);
    console.log("Skip:", skipAmount, "sec");

    // tambah skip untuk tap berikutnya
    skipAmount += 5;
    if (skipAmount > 100) skipAmount = 5;

    // animasi feedback
    showSkipToast("➜ +" + (skipAmount - 5) + "s");

  } else {
    // tap pertama
    skipAmount = 5;
  }

  lastTap = now;
});

// ------------
// visual feedback (floating text)
// ------------
function showSkipToast(msg){
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.style.position = "absolute";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.padding = "8px 14px";
  toast.style.fontSize = "16px";
  toast.style.background = "rgba(0,0,0,0.6)";
  toast.style.color = "white";
  toast.style.borderRadius = "8px";
  toast.style.pointerEvents = "none";
  toast.style.opacity = "1";
  toast.style.transition = "opacity 0.6s ease-out";
  box.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 600);
  }, 400);
}

  overlay.appendChild(box);

  // Klik luar player untuk tutup
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

playBtn.addEventListener('click', ()=>{
  if (!currentVideoId){
    alert('Pilih video dulu ya 😊');
    return;
  }
  const v = videos[currentVideoId];
  openVideoFrame(v);

  // naikkan view sekali per pemilihan
  if (viewIncrementedFor !== currentVideoId){
    viewIncrementedFor = currentVideoId;
    db.ref(`videos/${currentVideoId}/views`).transaction(cur => (cur||0)+1);
  }

  // simpan history terakhir ditonton di localStorage
  const payload = {
    videoId: currentVideoId,
    title: v.title,
    watchedAt: Date.now()
  };
  localStorage.setItem(LAST_WATCHED_KEY, JSON.stringify(payload));
  renderLastWatched(payload);
});

/* ----------------- like ----------------- */

likeBtn.addEventListener('click', ()=>{
  if (!currentVideoId) return;
  db.ref(`videos/${currentVideoId}/likes`).transaction(cur => (cur||0)+1);
});

/* ----------------- comments ----------------- */

function listenComments(videoId){
  detachCommentsListener();
  commentList.innerHTML =
    '<div style="font-size:.8rem;color:#9ca3af;">Memuat komentar...</div>';

  commentsRef = db.ref(`comments/${videoId}`);
  commentsRef.on('value', snap=>{
    const data = snap.val() || {};
    const arr = Object.values(data).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));

    commentList.innerHTML = '';
    arr.forEach(c=>{
      const item = cE('div','comment-item');
      const head = cE('div',null);
      head.innerHTML = `<strong>${c.name || 'Anonim'}</strong>`;
      const text = cE('div',null,c.text || '');
      const meta = cE('div','comment-meta',
        fmtDate(c.createdAt||Date.now()));
      item.appendChild(head);
      item.appendChild(text);
      item.appendChild(meta);
      commentList.appendChild(item);
    });

    db.ref(`videos/${videoId}/commentsCount`).set(arr.length);
  });
}

commentForm.addEventListener('submit', e=>{
  e.preventDefault();
  if (!currentVideoId){
    alert('Pilih video dulu dulu sebelum komentar.');
    return;
  }
  const name = (commentName.value || 'Anonim').trim();
  const text = commentText.value.trim();
  if (!text) return;

  db.ref(`comments/${currentVideoId}`).push({
    name,
    text,
    createdAt: Date.now()
  }).then(()=>{
    commentText.value = '';
  });
});

/* ----------------- search ----------------- */

searchInput.addEventListener('input', e=>{
  renderVideoList(e.target.value);
});

/* ----------------- load video list realtime ----------------- */

db.ref('videos').on('value', snap=>{
  videos = snap.val() || {};
  renderVideoList(searchInput.value || '');

  if (currentVideoId && videos[currentVideoId]){
    selectVideo(currentVideoId);
  }
});

/* ----------------- last watched box ----------------- */

function renderLastWatched(obj){
  if (!obj){
    lastWatchedBox.textContent = 'Kamu belum pernah nonton video di sini.';
    return;
  }
  lastWatchedBox.textContent =
    `Terakhir kamu nonton: "${obj.title}" pada ${fmtDate(obj.watchedAt)}.`;
}

/* ----------------- on load ----------------- */

window.addEventListener('load', ()=>{
  // baca ?v= untuk buka video langsung
  const params = new URLSearchParams(window.location.search);
  const vId = params.get('v');

  const last = localStorage.getItem(LAST_WATCHED_KEY);
  if (last){
    try{ renderLastWatched(JSON.parse(last)); }catch(e){ /* ignore */ }
  }

  if (vId){
    const check = setInterval(()=>{
      if (Object.keys(videos).length){
        clearInterval(check);
        if (videos[vId]) selectVideo(vId);
      }
    },300);
  }
});
