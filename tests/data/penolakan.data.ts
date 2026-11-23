// =====================================================================
// DATA UJI — Penolakan pengajuan (role Ditmawa), TC-DIT-016
// Dipakai oleh: tests/ditmawa/penolakan.spec.ts
// =====================================================================

export const URL_PENGAJUAN = '/kemahasiswaan/lomba';

// ---------- LOMBA YANG MAU DITOLAK ----------
// Kosongkan ('') untuk salah satu / keduanya kalau tidak dipakai sebagai filter.
// Kartu harus memuat SEMUA teks yang diisi (huruf besar/kecil tidak berpengaruh).
// Bisa ditimpa lewat .env: LOMBA_NAMA="..." dan MAHASISWA_NAMA="..."
export const TARGET = {
  namaLomba: 'lomba intuisi primakara 2026',
  namaMahasiswa: 'I Dewa Gede Agung Devan PRAWIRA',
};

export const STATUS_AWAL = 'Diajukan';
export const STATUS_AKHIR = 'Ditolak';

export const TOMBOL_TOLAK = 'Tolak';

// Alasan penolakan (dipakai kalau sistem menampilkan kolom alasan)
export const ALASAN = 'Ditolak otomatis oleh Playwright (TC-DIT-016)';

// Tombol konfirmasi pada dialog (kalau ada dialog)
export const TOMBOL_KONFIRMASI = /tolak|ya|konfirmasi|kirim|lanjut/i;

// Batas aman jumlah halaman yang dibaca
export const MAKS_HALAMAN = 30;
