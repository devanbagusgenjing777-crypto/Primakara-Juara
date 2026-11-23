// =====================================================================
// MAHASISWA — Update Pasca Lomba + Kirim Laporan Hasil
//   TC-MHS-006 : Disetujui              → Menunggu Laporan Hasil
//   TC-MHS-007 : Menunggu Laporan Hasil → Menunggu Finalisasi
// Tujuan: membuat data untuk kartu "Menunggu Finalisasi" & "Lomba Aktif"
//         di Dashboard Ditmawa.
// Jalankan : npx playwright test tests/mahasiswa/pasca.lomba.spec.ts --project=mahasiswa --headed
// Pilih lomba tertentu : isi di .env  LOMBA_ID=70   (kalau kosong → otomatis ambil
//                        lomba pertama berstatus "Disetujui" milik mahasiswa)
// =====================================================================
import { test, expect, type Page } from '@playwright/test';
import { FILE_UPLOAD as FILE, PASCA, LAPORAN } from '../data/pasca.lomba.data';
import { simpanLomba, bacaLomba } from '../data/lomba.state';

test.describe.configure({ mode: 'serial' });

// ---------- PESAN ----------
const mulai = (id: string, t: string) => console.log(`\n🚦 [${id}] ${t}`);
const langkah = (m: string) => console.log(`   ➡️  ${m}`);
const sukses = (id: string, m: string) => console.log(`✅🎉 [${id}] BERHASIL — ${m}`);

let urlLomba = '';

// ---------- CARI LOMBA ----------
async function pilihLomba(page: Page, statusDicari: string) {
  if (process.env.LOMBA_ID) {
    urlLomba = `/lomba/${process.env.LOMBA_ID}`;
    langkah(`Memakai LOMBA_ID dari .env → ${urlLomba}`);
    return;
  }
  if (urlLomba) return;

  // lanjutkan lomba yang tadi diproses (kalau statusnya cocok)
  const catatan = bacaLomba();
  if (catatan && catatan.status === statusDicari) {
    urlLomba = catatan.url;
    langkah(`Melanjutkan lomba dari catatan terakhir → ${urlLomba} (${catatan.status})`);
    return;
  }

  // Lomba berstatus Disetujui ada di menu Pengajuan; form Update Pasca Lomba ada di halaman detailnya
  langkah('📚 Membuka menu Pengajuan');
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Pengajuan', exact: true }).first().click();
  await page.waitForLoadState('networkidle');

  // cari link lomba di dekat tulisan status yang dicari
  const href = await page.evaluate((status) => {
    const el = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && (e.textContent || '').trim() === status) as HTMLElement | undefined;
    if (!el) return null;
    const a = el.closest('a') as HTMLAnchorElement | null;
    if (a) return a.getAttribute('href');
    let cur: HTMLElement | null = el;
    while (cur) {
      const link = cur.querySelector('a[href*="/lomba/"]') as HTMLAnchorElement | null;
      if (link) return link.getAttribute('href');
      cur = cur.parentElement;
    }
    return null;
  }, statusDicari);
  expect(href, `❌ Tidak ada lomba berstatus "${statusDicari}" di menu Pengajuan. Setujui dulu lewat Ditmawa, atau isi LOMBA_ID di .env.`).toBeTruthy();
  urlLomba = new URL(href!, page.url()).pathname;
  langkah(`Lomba terpilih: ${urlLomba}`);
}

// =====================================================================
test('TC-MHS-006 — Update Pasca Lomba → Menunggu Laporan Hasil', async ({ page }) => {
  mulai('TC-MHS-006', 'Update Pasca Lomba');
  await pilihLomba(page, 'Disetujui');
  await page.goto(urlLomba);

  langkah('⬇️ Gulir ke bagian "Update Pasca Lomba"');
  const bagianPasca = page.getByText('Update Pasca Lomba', { exact: true }).first();
  await expect(bagianPasca, '❌ Bagian "Update Pasca Lomba" tidak ada di detail lomba').toBeVisible();
  await bagianPasca.evaluate((el) => el.scrollIntoView({ block: 'start' }));

  langkah('📎 Unggah bukti (file 1)');
  await page.getByLabel('Pilih File').setInputFiles(FILE);

  langkah('🏁 Pilih hasil: Lolos');
  await page.getByRole('button', { name: 'Lolos' }).click();

  langkah('📎 Unggah bukti (file 2)');
  await page.getByLabel('Pilih File').nth(1).setInputFiles(FILE);

  langkah(`📅 Tanggal pelaksanaan final: ${PASCA.tanggalFinal}`);
  await page.getByRole('textbox', { name: 'Tanggal Pelaksanaan Final' }).fill(PASCA.tanggalFinal);

  langkah(`🏟️ Pelaksanaan: ${PASCA.pelaksanaan} / ${PASCA.lokasi}`);
  await page.getByRole('button', { name: PASCA.pelaksanaan }).click();
  await page.getByRole('button', { name: PASCA.lokasi }).click();

  langkah(`🎫 Dispensasi: ${PASCA.dispensasi}`);
  await page.getByRole('button', { name: PASCA.dispensasi, exact: true }).click();
  await page.getByRole('textbox', { name: 'Tanggal Dispen Final' }).fill(PASCA.tanggalDispen);

  langkah('💾 Simpan Update Pasca Lomba');
  await page.getByRole('button', { name: 'Simpan Update Pasca Lomba' }).click();

  await expect(page.getByText('Menunggu Laporan Hasil').first(), '❌ Status tidak berubah menjadi "Menunggu Laporan Hasil"').toBeVisible();
  simpanLomba(urlLomba, 'Menunggu Laporan Hasil');
  sukses('TC-MHS-006', `${urlLomba} → status: Menunggu Laporan Hasil`);
});

// =====================================================================
test('TC-MHS-007 — Kirim Laporan Hasil → Menunggu Finalisasi', async ({ page }) => {
  mulai('TC-MHS-007', 'Kirim Laporan Hasil');
  await pilihLomba(page, 'Menunggu Laporan Hasil');
  await page.goto(urlLomba);

  langkah(`🥇 Pilih hasil: ${LAPORAN.juara}`);
  await page.getByRole('button', { name: LAPORAN.juara }).click();

  langkah('🏦 Isi data rekening');
  await page.getByRole('textbox', { name: 'Nomor Rekening' }).fill(LAPORAN.rekening);
  await page.getByRole('textbox', { name: 'Nama Bank' }).fill(LAPORAN.bank);
  await page.getByRole('textbox', { name: 'Nama Pemilik Rekening' }).fill(LAPORAN.pemilik);

  langkah('📎 Unggah file 1 (bukti)');
  await page.getByLabel('Pilih File').first().setInputFiles(FILE);

  langkah('🔗 Isi link publikasi juara');
  await page.getByRole('textbox', { name: 'Link Publikasi Juara' }).fill(LAPORAN.link);

  langkah('📎 Unggah file 2 (publikasi)');
  await page.getByLabel('Pilih File').nth(1).setInputFiles(FILE);

  langkah('📤 Kirim Laporan Hasil');
  await page.getByRole('button', { name: 'Kirim Laporan Hasil' }).click();

  await expect(page.getByText('Menunggu Finalisasi').first(), '❌ Status tidak berubah menjadi "Menunggu Finalisasi"').toBeVisible();
  // alamat mahasiswa: /lomba/70 → alamat Ditmawa: /kemahasiswaan/lomba/70
  simpanLomba(urlLomba, 'Menunggu Finalisasi');
  sukses('TC-MHS-007', `${urlLomba} → status: Menunggu Finalisasi (tinggal difinalisasi Ditmawa)`);
});
