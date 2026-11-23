// =====================================================================
// Catatan "lomba terakhir yang diproses" — dipakai bersama oleh:
//   tests/mahasiswa/pasca.lomba.spec.ts  (menulis)
//   tests/ditmawa/finalisasi.spec.ts     (membaca)
// Disimpan di .auth/lomba-terakhir.json (folder .auth sudah di-ignore git)
// =====================================================================
import fs from 'fs';
import path from 'path';

export type CatatanLomba = { url: string; status: string; waktu: string };

const BERKAS = path.join(__dirname, '..', '..', '.auth', 'lomba-terakhir.json');

export function simpanLomba(url: string, status: string) {
  fs.mkdirSync(path.dirname(BERKAS), { recursive: true });
  const isi: CatatanLomba = { url, status, waktu: new Date().toISOString() };
  fs.writeFileSync(BERKAS, JSON.stringify(isi, null, 2));
}

export function bacaLomba(): CatatanLomba | null {
  try {
    return JSON.parse(fs.readFileSync(BERKAS, 'utf-8')) as CatatanLomba;
  } catch {
    return null;
  }
}