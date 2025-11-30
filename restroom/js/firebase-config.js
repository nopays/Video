// =============================
// FIREBASE CONFIG UNTUK PROJECT
// =============================
const firebaseConfig = {
  apiKey: "AIzaSyC8YpXo2pq1EwAvIT554NIbGuC29FkVsyQ",
  authDomain: "video-5be65.firebaseapp.com",
  
  // WAJIB TAMBAH databaseURL (tak muncul di UI, tapi format dia tetap sama)
  databaseURL: "https://video-5be65-default-rtdb.firebaseio.com",

  projectId: "video-5be65",
  storageBucket: "video-5be65.firebasestorage.app",
  messagingSenderId: "615838476332",
  appId: "1:615838476332:web:81f3f8ec5bd4bd916a0989",
  measurementId: "G-HBGSTZR3NK"
};

// =============================
// INISIALISASI V9 COMPAT MODE
// =============================
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
window.db = db;

