// =====================================================================
// DITMAWA — TC-DIT-016 : Menolak pengajuan lomba (Diajukan → Ditolak)
// Data uji : tests/data/penolakan.data.ts
// Jalankan : npx playwright test tests/ditmawa/penolakan.spec.ts --project=ditmawa --headed
// Lomba yang ditolak ditentukan oleh (urutan prioritas):
//   1. .env  LOMBA_ID=124
//   2. nama lomba + nama mahasiswa di tests/data/penolakan.data.ts (TARGET)
//      (atau .env LOMBA_NAMA / MAHASISWA_NAMA)
//   Kartu "Diajukan" PERTAMA yang cocok yang ditolak; lomba di catatan terakhir
//   (alur persetujuan/pasca lomba) selalu dilewati.
// =====================================================================
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { TARGET, URL_PENGAJUAN, STATUS_AWAL, STATUS_AKHIR, TOMBOL_TOLAK, ALASAN, TOMBOL_KONFIRMASI, MAKS_HALAMAN } from '../data/penolakan.data';

const ID = 'TC-DIT-016';
const langkah = (m: string) => console.log(`   ➡️  ${m}`);

// Lomba yang sedang dipakai alur persetujuan → jangan ditolak
function idDilindungi(): string | null {
  try {
    const f = path.join(__dirname, '..', '..', '.auth', 'lomba-terakhir.json');
    const url = JSON.parse(fs.readFileSync(f, 'utf-8')).url as string;
    return url.match(/\/lomba\/(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

test(`${ID} — Ditmawa menolak pengajuan lomba`, async ({ page }) => {
  test.setTimeout(120_000);
  console.log(`\n🚦 [${ID}] Tolak pengajuan lomba`);

  const dilindungi = idDilindungi();
  const idEnv = process.env.LOMBA_ID || null;
  const namaLomba = (process.env.LOMBA_NAMA ?? TARGET.namaLomba).trim();
  const namaMhs = (process.env.MAHASISWA_NAMA ?? TARGET.namaMahasiswa).trim();
  langkah(`🔖 Filter → lomba: "${namaLomba || '(semua)'}", mahasiswa: "${namaMhs || '(semua)'}"${idEnv ? `, ID: ${idEnv}` : ''}`);
  let idLomba: string | null = null;
  const namaCocokLain: string[] = []; // kartu bernama sama tapi bukan "Diajukan" / tidak punya tombol Tolak
  let halTerakhir = 0;
  let lombaPernahAda = false;
  let mhsPernahAda = false;

  // 1) Cari kartu berstatus "Diajukan" yang punya tombol Tolak, tandai dengan atribut
  for (let hal = 1; hal <= MAKS_HALAMAN && !idLomba; hal++) {
    await page.goto(`${URL_PENGAJUAN}?page=${hal}`);
    await expect(page.getByRole('heading', { name: 'Pengajuan' }), `❌ Halaman Pengajuan (page=${hal}) tidak terbuka`).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState('networkidle');

    const hasil = await page.evaluate(
      ({ status, tombol, idEnv, dilindungi, namaLomba, namaMhs }) => {
        const idDari = (h: string | null) => h?.match(/\/lomba\/(\d+)/)?.[1] ?? null;
        const jumlahKartu = new Set([...document.querySelectorAll('a[href*="/lomba/"]')].map((a) => idDari(a.getAttribute('href'))).filter(Boolean)).size;
        const lain: string[] = [];

        // kartu = elemen terkecil yang memuat tepat 1 lomba
        const kartuDari = (link: Element): HTMLElement => {
          let cur = link as HTMLElement;
          while (cur.parentElement && cur.parentElement !== document.body) {
            const ids = new Set([...cur.parentElement.querySelectorAll('a[href*="/lomba/"]')].map((a) => idDari(a.getAttribute('href'))).filter(Boolean));
            if (ids.size > 1) break;
            cur = cur.parentElement;
          }
          return cur;
        };
        // apakah nama lomba / nama mahasiswa muncul di salah satu kartu halaman ini?
        let adaLomba = false;
        let adaMhs = false;
        for (const link of document.querySelectorAll('a[href*="/lomba/"]')) {
          if (!idDari(link.getAttribute('href'))) continue;
          const t = (kartuDari(link).textContent || '').toLowerCase();
          if (namaLomba && t.includes(namaLomba.toLowerCase())) adaLomba = true;
          if (namaMhs && t.includes(namaMhs.toLowerCase())) adaMhs = true;
        }

        for (const link of document.querySelectorAll('a[href*="/lomba/"]')) {
          const id = idDari(link.getAttribute('href'));
          if (!id) continue;
          if (idEnv && id !== idEnv) continue;
          if (!idEnv && id === dilindungi) continue;
          // naik sampai ketemu kartu yang hanya memuat 1 lomba
          let cur: HTMLElement | null = link as HTMLElement;
          while (cur && cur !== document.body) {
            const ids = new Set([...cur.querySelectorAll('a[href*="/lomba/"]')].map((a) => idDari(a.getAttribute('href'))));
            if (cur.matches('a[href*="/lomba/"]')) ids.add(idDari(cur.getAttribute('href')));
            if (ids.size > 1) break;
            const adaTolak = [...cur.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === tombol);
            const adaStatus = [...cur.querySelectorAll('*')].some((e) => e.children.length === 0 && (e.textContent || '').trim() === status);
            const teks = (cur.textContent || '').toLowerCase();
            const cocokNama = (!namaLomba || teks.includes(namaLomba.toLowerCase())) && (!namaMhs || teks.includes(namaMhs.toLowerCase()));
            if (adaTolak && adaStatus && cocokNama) {
              cur.setAttribute('data-target-tolak', '1');
              return { id, jumlahKartu, lain, adaLomba, adaMhs };
            }
            if (cocokNama && !lain.includes(id)) lain.push(`#${id}`);
            cur = cur.parentElement;
          }
        }
        return { id: null as string | null, jumlahKartu, lain, adaLomba, adaMhs };
      },
      { status: STATUS_AWAL, tombol: TOMBOL_TOLAK, idEnv, dilindungi, namaLomba, namaMhs },
    );
    idLomba = hasil.id;
    for (const l of hasil.lain) if (!namaCocokLain.includes(l)) namaCocokLain.push(l);
    halTerakhir = hal;
    lombaPernahAda ||= hasil.adaLomba;
    mhsPernahAda ||= hasil.adaMhs;

    // halaman kosong → daftar sudah habis, berhenti (tidak perlu cek halaman berikutnya)
    if (!idLomba && hasil.jumlahKartu === 0) {
      langkah(`📭 Halaman ${hal} kosong — daftar pengajuan sudah habis`);
      break;
    }
    if (!idLomba) langkah(`🔎 Belum ada kandidat di halaman ${hal} (${hasil.jumlahKartu} kartu)`);
  }

  const dicari = `lomba "${namaLomba || '(semua)'}" & mahasiswa "${namaMhs || '(semua)'}"${idEnv ? ` (LOMBA_ID=${idEnv})` : ''}`;
  let pesanTidakAda = '';
  if (!idLomba) {
    const cek = `(dicek ${halTerakhir} halaman daftar pengajuan)`;
    if (namaLomba && !lombaPernahAda) {
      pesanTidakAda = `❌ LOMBA TIDAK ADA: "${namaLomba}" tidak ditemukan di daftar pengajuan ${cek}.` + (namaMhs && !mhsPernahAda ? ` Nama peserta "${namaMhs}" juga tidak ada.` : '');
    } else if (namaMhs && !mhsPernahAda) {
      pesanTidakAda = `❌ NAMA PESERTA TIDAK ADA: "${namaMhs}" tidak ditemukan di daftar pengajuan ${cek}.` + ` (Lomba "${namaLomba}" ada.)`;
    } else if (namaCocokLain.length) {
      pesanTidakAda = `❌ Lomba "${namaLomba}" milik "${namaMhs}" ada (${namaCocokLain.join(', ')}), tetapi statusnya bukan "${STATUS_AWAL}" / sudah tidak bisa ditolak.`;
    } else {
      pesanTidakAda = `❌ Lomba "${namaLomba}" dan peserta "${namaMhs}" masing-masing ada, tetapi BUKAN pada pengajuan yang sama ${cek}.`;
    }
    if (idEnv) pesanTidakAda += ` (LOMBA_ID=${idEnv} tidak cocok dengan kartu manapun)`;
  }
  if (!idLomba) langkah(pesanTidakAda);
  expect(idLomba, pesanTidakAda).toBeTruthy();
  langkah(`🎯 Lomba target: #${idLomba}`);

  // 2) Klik Tolak pada kartu target
  const kartu = page.locator('[data-target-tolak="1"]');
  await kartu.getByRole('button', { name: TOMBOL_TOLAK, exact: true }).click();
  langkah('🖱️ Klik "Tolak"');

  // 3) Dialog (jika ada): isi alasan lalu konfirmasi
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
    langkah('🔔 Dialog penolakan muncul');
    const kolom = dialog.locator('textarea, input[type="text"]').first();
    if (await kolom.isVisible().catch(() => false)) {
      await kolom.fill(ALASAN);
      langkah(`📝 Alasan diisi: ${ALASAN}`);
    }
    await dialog.getByRole('button', { name: TOMBOL_KONFIRMASI }).last().click();
    langkah('📨 Konfirmasi penolakan');
    await expect(dialog, '❌ Dialog penolakan tidak tertutup').toBeHidden({ timeout: 15_000 });
  }

  // 4) Verifikasi di halaman detail
  await page.goto(`/kemahasiswaan/lomba/${idLomba}`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(STATUS_AKHIR, { exact: true }).first(), `❌ Status lomba #${idLomba} tidak berubah menjadi "${STATUS_AKHIR}"`).toBeVisible({ timeout: 15_000 });
  if (namaLomba) {
    await expect(page.getByText(namaLomba, { exact: false }).first(), '❌ Nama lomba tidak tampil di detail').toBeVisible();
  }
  if (namaMhs) {
    await expect(page.getByText(namaMhs, { exact: false }).first(), '❌ Nama mahasiswa tidak tampil di detail').toBeVisible();
  }
  langkah(`🔍 Detail #${idLomba} berstatus ${STATUS_AKHIR}`);

  // 5) Pengajuan tidak lagi bisa ditolak/disetujui (tombol aksi hilang)
  await expect(page.getByRole('button', { name: TOMBOL_TOLAK, exact: true }), '❌ Tombol "Tolak" masih ada setelah pengajuan ditolak').toHaveCount(0);

  console.log(`✅🎉 [${ID}] BERHASIL — lomba #${idLomba} berstatus ${STATUS_AKHIR}`);
});
