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

  // Hanya kartu berstatus "statusDicari" yang dibuka, kartu lain diabaikan.
  // Dicari di halaman 1, 2, 3, ... sampai ketemu (maks. 10 halaman).
  const daftar = new URL(page.url()).pathname;
  let href: string | null = null;
  for (let hal = 1; hal <= 10 && !href; hal++) {
    if (hal > 1) {
      await page.goto(`${daftar}?page=${hal}`);
      await page.waitForLoadState('networkidle');
    }
    href = await page.evaluate((status) => {
      const penanda = [...document.querySelectorAll('body *')]
        .filter((e) => e.children.length === 0 && (e.textContent || '').trim() === status)
        // abaikan teks di dropdown filter / menu / tab
        .filter((e) => !e.closest('select, option, nav, aside, [role="tab"], [role="listbox"], [role="option"], [role="menu"]'));
      for (const el of penanda) {
        // naik sampai ketemu kartu yang memuat TEPAT 1 link lomba (kartunya sendiri)
        let cur: HTMLElement | null = el as HTMLElement;
        while (cur && cur !== document.body) {
          const link = cur.matches('a[href*="/lomba/"]') ? [cur] : [...cur.querySelectorAll('a[href*="/lomba/"]')];
          if (link.length === 1) return (link[0] as HTMLAnchorElement).getAttribute('href');
          if (link.length > 1) break; // sudah terlalu jauh naik (mencakup kartu lain)
          cur = cur.parentElement;
        }
      }
      return null;
    }, statusDicari);
    if (!href && hal === 1) langkah(`🔎 Belum ada kartu "${statusDicari}" di halaman 1, lanjut halaman berikutnya`);
  }
  expect(
    href,
    `❌ Tidak ada lomba berstatus "${statusDicari}" di menu Pengajuan. Setujui dulu lewat Ditmawa, atau isi LOMBA_ID di .env.`,
  ).toBeTruthy();
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

  await expect(
    page.getByText('Menunggu Laporan Hasil').first(),
    '❌ Status tidak berubah menjadi "Menunggu Laporan Hasil"',
  ).toBeVisible();
  simpanLomba(urlLomba, 'Menunggu Laporan Hasil');
  sukses('TC-MHS-006', `${urlLomba} → status: Menunggu Laporan Hasil`);
});

// =====================================================================
// =====================================================================
test('TC-MHS-007 — Laporan Hasil Final → Menunggu Finalisasi', async ({ page }) => {
  mulai('TC-MHS-007', 'Kirim Laporan Hasil Final');
  await pilihLomba(page, 'Menunggu Laporan Hasil');
  await page.goto(urlLomba);

  langkah('⬇️ Gulir ke bagian "Laporan Hasil Final"');
  const bagianLaporan = page.getByText('Laporan Hasil Final', { exact: true }).first();
  await expect(bagianLaporan, '❌ Bagian "Laporan Hasil Final" tidak ada di detail lomba').toBeVisible();
  await bagianLaporan.evaluate((el) => el.scrollIntoView({ block: 'start' }));

  langkah(`🥇 Pilih Hasil Final: ${LAPORAN.juara}`);
  await page.getByRole('button', { name: LAPORAN.juara, exact: true }).click();

  langkah('📸 Unggah Foto Pelaksanaan Final (wajib jas Primakara)');
  await page.getByLabel('Pilih File').first().setInputFiles(FILE);

  langkah('🔗 Isi Link Publikasi Juara');
  await page.getByPlaceholder(/Instagram \/ web \/ drive pengumuman/i).fill(LAPORAN.link);

  langkah('🏆 Unggah Piagam Juara');
  await page.getByLabel('Pilih File').nth(1).setInputFiles(FILE);
  await expect(
    page.getByText('Belum ada file dipilih'),
    '❌ Masih ada file yang belum terunggah',
  ).toHaveCount(0);

  // Data rekening hanya diisi kalau field-nya muncul di halaman
  const rekening = page.getByRole('textbox', { name: 'Nomor Rekening' });
  if ((await rekening.count()) > 0) {
    langkah('🏦 Isi data rekening');
    await rekening.fill(LAPORAN.rekening);
    await page.getByRole('textbox', { name: 'Nama Bank' }).fill(LAPORAN.bank);
    await page.getByRole('textbox', { name: 'Nama Pemilik Rekening' }).fill(LAPORAN.pemilik);
  }

  // "Juara Lainnya" bersifat opsional, dilewati dulu

  langkah('📤 Kirim Laporan Hasil');
  await page.getByRole('button', { name: 'Kirim Laporan Hasil' }).click();

  await expect(
    page.getByText('Menunggu Finalisasi').first(),
    '❌ Status tidak berubah menjadi "Menunggu Finalisasi"',
  ).toBeVisible();
  // alamat mahasiswa: /lomba/70 → alamat Ditmawa: /kemahasiswaan/lomba/70
  simpanLomba(urlLomba, 'Menunggu Finalisasi');
  sukses('TC-MHS-007', `${urlLomba} → status: Menunggu Finalisasi (tinggal difinalisasi Ditmawa)`);
});