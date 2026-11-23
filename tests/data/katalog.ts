import { unik } from '../ui';

// Data uji untuk modul Ditmawa › Katalog (form "Buat Katalog Baru").
// Nama dibuat unik per run supaya tidak bentrok dengan data yang sudah ada.
const namaAwal = unik('QA-Katalog');

// Input <input type="date"> di Playwright diisi dengan format yyyy-mm-dd
// (tampilan di browser mm/dd/yyyy hanya format lokal, bukan format isian).
const tanggal = (tambahHari: number) => {
  const d = new Date();
  d.setDate(d.getDate() + tambahHari);
  return d.toISOString().slice(0, 10);
};

export const dataKatalog = {
  // Data valid untuk TC-DIT-021 (tambah)
  valid: {
    nama: namaAwal,                       // wajib
    penyelenggara: 'QA Penyelenggara',    // wajib
    deskripsi: 'Katalog lomba dibuat otomatis oleh automation test QA.',
    linkDetail: 'https://example.com/lomba-qa',
    // Dropdown native <select>: isi dengan teks opsi persis seperti di UI
    kategori: 'Akademik',
    tingkat: 'Nasional',
    pendaftaranDibuka: tanggal(0),        // wajib
    pendaftaranDitutup: tanggal(30),      // wajib
    tanggalPelaksanaan: tanggal(60),
  },

  // Data untuk TC-DIT-022 (ubah)
  ubah: {
    nama: `${namaAwal}-ubah`,
  },
};

export type DataKatalog = typeof dataKatalog;