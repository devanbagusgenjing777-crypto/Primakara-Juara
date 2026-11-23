// DATA UJI — A. Dashboard (Ditmawa), TC-DIT-001 s.d. 010
// Dipakai oleh: tests/ditmawa/A dashboard.spec.ts

export type Halaman = 'Pengajuan' | 'Pelaporan' | 'Arsip';

export const SEMUA_STATUS = ['Draft', 'Diajukan', 'Ditolak', 'Disetujui', 'Tidak Lolos Final', 'Menunggu Laporan Hasil', 'Menunggu Finalisasi', 'Selesai'] as const;
export type Status = (typeof SEMUA_STATUS)[number];

export type Baris = { nama: string; jumlah: number };

// ---------- Label di Dashboard ----------
export const JUDUL_DASHBOARD = 'Dashboard Kemahasiswaan';

export const KARTU = {
  menungguPersetujuan: 'Menunggu Persetujuan',
  menungguFinalisasi: 'Menunggu Finalisasi',
  lombaAktif: 'Lomba Aktif',
  totalSelesai: 'Total Selesai',
} as const;
export type KunciKartu = keyof typeof KARTU;

export const BAGIAN = {
  lombaTerbaru: 'Lomba Terbaru',
  perluTindakLanjut: 'Perlu Tindak Lanjut',
  papanPeringkat: 'Papan Peringkat',
  partisipasi: 'Partisipasi Terbanyak',
  juara: 'Juara Terbanyak',
  judulMenunggu: 'Menunggu Persetujuan',
  subJudulMenunggu: 'Pengajuan lomba yang perlu ditinjau dan disetujui',
} as const;

// ---------- Pesan saat data kosong (potongan kalimat) ----------
export const PESAN_KOSONG = {
  lombaTerbaru: 'Belum ada aktivitas lomba',
  perluTindakLanjut: 'Tidak ada tindakan yang perlu dilakukan',
  juara: 'Belum ada juara yang tercatat',
  menungguPersetujuan: 'Tidak ada pengajuan yang menunggu persetujuan',
} as const;

// ---------- Sumber "data aktual" tiap kartu (TC-DIT-001..004) ----------
// ⚠️ Lomba Aktif (hasil pengamatan): Diajukan + Disetujui + Menunggu Laporan Hasil + Menunggu Finalisasi.
export const SUMBER_HITUNGAN: Record<KunciKartu, { halaman: Halaman; status: Status[] }[]> = {
  menungguPersetujuan: [{ halaman: 'Pengajuan', status: ['Diajukan'] }],
  menungguFinalisasi: [{ halaman: 'Pelaporan', status: ['Menunggu Finalisasi'] }],
    lombaAktif: [
    { halaman: 'Pengajuan', status: ['Diajukan', 'Disetujui'] },
    { halaman: 'Pelaporan', status: ['Menunggu Laporan Hasil', 'Menunggu Finalisasi'] },
  ],
  totalSelesai: [{ halaman: 'Arsip', status: ['Selesai'] }],
};

// ---------- Lomba yang dihitung Dashboard tapi TIDAK tampil di daftar Ditmawa ----------
// Contoh: status "Menunggu Laporan Hasil" (hanya terlihat di detail mahasiswa).
// ⚠️ Ubah angkanya bila jumlahnya berubah. Setelah TC-MHS-007 (kirim laporan hasil)
//    lomba itu pindah ke Pelaporan → kurangi angka ini, kalau tidak hitungan jadi dobel.
export const TAMBAHAN_TAK_TERLIHAT: Partial<Record<KunciKartu, number>> = {
  lombaAktif: 1,
};

// ---------- TC-DIT-005: Lomba Terbaru ----------
export const LOMBA_TERBARU = {
  nama: 'VIBE CODE NASIONAL 2026',
  mahasiswa: 'I Dewa Gede Agung Devan Prawira',
  universitas: 'Primakara University',
};

// ---------- TC-DIT-007 & 008: peringkat (kosongkan [] kalau hanya cek urutan) ----------
// Contoh isi: partisipasi: [{ nama: 'I Dewa Gede Agung Devan Prawira', jumlah: 30 }]
export const PERINGKAT_DIHARAPKAN: { partisipasi: Baris[]; juara: Baris[] } = {
  partisipasi: [],
  juara: [],
};

// ---------- TC-DIT-009 & 010: tampilan ----------
export const TAMPILAN = {
  viewport: { width: 1440, height: 900 },
  toleransiPx: 2,
};

// ---------- TC-DIT-006: sesi akun tanpa tindak lanjut (opsional, di .env) ----------
export const ENV_STORAGE_KOSONG = 'STORAGE_DITMAWA_KOSONG';

// Batas aman jumlah halaman daftar yang dibaca
export const MAKS_HALAMAN_SUMBER = 50;
