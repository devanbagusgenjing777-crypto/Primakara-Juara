// =====================================================================
// DATA UJI — Update Pasca Lomba & Laporan Hasil (role Mahasiswa)
// Dipakai oleh: tests/mahasiswa/pasca.lomba.spec.ts
// =====================================================================
import path from 'path';

// File yang diunggah (sama seperti test pengajuan lomba)
export const FILE_UPLOAD = path.join(__dirname, '..', 'files', 'logo-primakara.jpg');

const hariIni = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; // yyyy-mm-dd
};
export const LAPORAN_FINAL = {
  hasil: 'Juara 1',
  link: 'https://www.instagram.com/p/contoh-pengumuman-juara',
};
// TC-MHS-006 — Update Pasca Lomba (Disetujui → Menunggu Laporan Hasil)
export const PASCA = {
  tanggalFinal: hariIni(),
  tanggalDispen: hariIni(),
  pelaksanaan: 'Offline' as 'Online' | 'Offline',
  lokasi: 'Dalam Bali',
  dispensasi: 'Ya',
};

// TC-MHS-007 — Laporan Hasil (Menunggu Laporan Hasil → Menunggu Finalisasi)
export const LAPORAN = {
  juara: 'Juara 1', // harus persis sama dengan teks tombol: Juara 1/2/3, Harapan 1/2/3, Tidak Juara
  link: 'https://www.instagram.com/p/contoh-pengumuman-juara',
  // hanya dipakai kalau field rekening muncul di halaman
  rekening: '1234567890',
  bank: 'BCA',
  pemilik: 'Devan',
};