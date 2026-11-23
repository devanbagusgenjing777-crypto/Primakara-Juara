import { test, expect } from '@playwright/test';
import { barisTabel, bukaDetailBaris, bukaMenu, cari, namaDiBaris } from '../ui';

test.describe('Ditmawa › Pelaporan, Arsip, Biaya, Notifikasi, Panduan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('TC-DIT-018 Cari dan lihat data pelaporan lomba', async ({ page }) => {
    await bukaMenu(page, 'pelaporan');
    test.skip((await barisTabel(page).count()) === 0, 'Belum ada data pelaporan');
    const baris = barisTabel(page).first();
    const nama = await namaDiBaris(baris);
    await cari(page, nama);
    await expect(barisTabel(page).filter({ hasText: nama }).first()).toBeVisible();
    await bukaDetailBaris(page, barisTabel(page).first());
    await expect(page.getByText(nama).first()).toBeVisible();
  });

  test('TC-DIT-019 Data arsip tidak dapat diubah', async ({ page }) => {
    await bukaMenu(page, 'arsip');
    test.skip((await barisTabel(page).count()) === 0, 'Belum ada lomba di arsip');
    await bukaDetailBaris(page, barisTabel(page).first());
    // TODO: konfirmasi aturan "arsip terkunci". Asumsi: tidak ada tombol edit/ubah/hapus.
    await expect(page.getByRole('button', { name: /edit|ubah|hapus/i })).toHaveCount(0);
  });

  test('TC-DIT-024 Biaya pendaftaran dan realisasi tampil [SEMI]', async ({ page }) => {
    await bukaMenu(page, 'biaya');
    await expect(barisTabel(page).first()).toBeVisible();
    await expect(page.getByText(/error|gagal memuat/i)).toHaveCount(0);
    // Pencocokan ke data sumber tetap manual (belum ada sumber pembanding otomatis).
  });

  test.fixme('TC-DIT-025 Rekap biaya per lomba [SEMI]', async () => {
    // Langkah: jumlahkan kolom biaya semua baris lomba terpilih, bandingkan dengan elemen "Total".
    // Butuh: nama kolom biaya & elemen total (TODO setelah melihat halaman Biaya).
  });

  test.fixme('TC-DIT-026 Notifikasi sesuai aktivitas [SEMI]', async () => {
    // Langkah: lakukan aktivitas (mis. setujui pengajuan), lalu cek notifikasi baru memuat aktivitas & waktunya.
    // Bisa digabung dengan TC-DIT-015 setelah alurnya stabil.
  });

  test('TC-DIT-027 Panduan dapat dibuka [MANUAL: bukti screenshot]', async ({ page }, testInfo) => {
    const kesalahan: string[] = [];
    page.on('pageerror', (e) => kesalahan.push(e.message));
    await bukaMenu(page, 'panduan');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await testInfo.attach('panduan-ditmawa', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    expect(kesalahan, 'Ada error JavaScript saat membuka Panduan').toEqual([]);
    // Penilaian keterbacaan tetap manual.
  });
});
