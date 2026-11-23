import { test, expect } from '@playwright/test';
import { bacaLomba, simpanLomba } from '../data/lomba.state';

const MAKS_HALAMAN = 30;

test('TC-DIT-015 Setujui lomba dari tahap pengajuan', async ({ page }) => {
  test.setTimeout(180_000);

  // 0. Ambil lomba dari catatan tahap 1
  const catatan = bacaLomba();
  expect(
    catatan,
    '❌ Tidak ada catatan lomba dari tahap pengajuan. Jalankan tahap 1 (pengajuan) dulu.'
  ).toBeTruthy();

  const idLomba = catatan!.url.match(/\/lomba\/(\d+)/)?.[1];
  expect(idLomba, `❌ ID lomba tidak terbaca dari catatan: ${catatan!.url}`).toBeTruthy();

  console.log('\n🚀 TC-DIT-015: PERSETUJUAN LOMBA DARI CATATAN');
  console.log(`🎯 Lomba target: #${idLomba} (status catatan: ${catatan!.status})`);

  const kolomST = page.getByRole('textbox', { name: 'Nomor Surat Tugas *' });
  const tombolSetujui = page.getByRole('button', { name: 'Setujui', exact: true });

  // 1. Cari kartu lomba target di daftar pengajuan Ditmawa
  let ketemu = false;
  for (let hal = 1; hal <= MAKS_HALAMAN && !ketemu; hal++) {
    console.log(`🌐 Membuka halaman ${hal}...`);
    await page.goto(`/kemahasiswaan/lomba?page=${hal}`);
    await expect(
      page.getByRole('heading', { name: 'Pengajuan' }),
      `❌ Halaman Pengajuan (page=${hal}) tidak terbuka.`
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState('networkidle');

    // Tandai kartu yang memuat link lomba target DAN tombol Setujui
    ketemu = await page.evaluate((id) => {
      const polaLink = new RegExp(`/lomba/${id}(?:[/?#]|$)`);
      const linkTarget = [...document.querySelectorAll('a[href*="/lomba/"]')].filter((a) =>
        polaLink.test(a.getAttribute('href') || '')
      );
      for (const link of linkTarget) {
        let cur: HTMLElement | null = link as HTMLElement;
        while (cur && cur !== document.body) {
          const hrefUnik = new Set(
            [...cur.querySelectorAll('a[href*="/lomba/"]')].map((a) => a.getAttribute('href'))
          );
          if (cur.matches('a[href*="/lomba/"]')) hrefUnik.add(cur.getAttribute('href'));
          if (hrefUnik.size > 1) break; // sudah terlalu jauh naik (mencakup kartu lain)
          const adaSetujui = [...cur.querySelectorAll('button')].some(
            (b) => (b.textContent || '').trim() === 'Setujui'
          );
          if (adaSetujui) {
            cur.setAttribute('data-target-lomba', '1');
            return true;
          }
          cur = cur.parentElement;
        }
      }
      return false;
    }, idLomba);

    if (!ketemu) console.log(`🔎 Lomba #${idLomba} belum ditemukan di halaman ${hal}`);
  }

  expect(
    ketemu,
    `❌ Kartu lomba #${idLomba} dengan tombol "Setujui" tidak ditemukan di daftar pengajuan. ` +
      'Mungkin sudah disetujui, atau statusnya bukan Diajukan.'
  ).toBeTruthy();

  // 2. Setujui hanya lomba target
  const kartu = page.locator('[data-target-lomba="1"]');
  console.log('🖱️ Mengklik tombol Setujui pada lomba target...');
  await kartu.getByRole('button', { name: 'Setujui', exact: true }).click();

  const noST = `ST-TEST-${Date.now()}`;
  console.log(`📝 Mengisi Nomor Surat Tugas: ${noST}`);
  await kolomST.fill(noST);

  console.log('📨 Mengirim konfirmasi persetujuan...');
  await tombolSetujui.last().click();
  await expect(kolomST, 'Dialog Surat Tugas tidak tertutup').toBeHidden();

  // 3. Verifikasi lewat halaman detail lomba itu sendiri
  console.log('🔍 Memverifikasi status di halaman detail...');
  await page.goto(`/kemahasiswaan/lomba/${idLomba}`);
  await expect(
    page.getByText('Disetujui').first(),
    `❌ Status lomba #${idLomba} tidak berubah menjadi "Disetujui"`
  ).toBeVisible({ timeout: 15_000 });

  // 4. Catat untuk tahap berikutnya
  simpanLomba(catatan!.url, 'Disetujui');
  console.log(`📝 Catatan diperbarui: ${catatan!.url} → Disetujui`);
  console.log(`🏆 TEST BERHASIL: lomba #${idLomba} disetujui (No. ST: ${noST})`);
});