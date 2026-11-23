import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';
import { bukaDashboard, bukaMenu, Rute } from '../ui';

// Dijalankan hanya jika SNAPSHOT=1. Tujuannya mengambil "peta" halaman (role + nama elemen)
// supaya selector bisa dibuat akurat tanpa menebak. Tidak mengubah data apa pun.
test.skip(!process.env.SNAPSHOT, 'Jalankan dengan SNAPSHOT=1');

test('Ambil snapshot halaman Ditmawa', async ({ page }) => {
  mkdirSync('snapshots', { recursive: true });

  const simpan = async (nama: string) => {
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500); // beri waktu data tampil
    writeFileSync(`snapshots/${nama}.yml`, await page.locator('body').ariaSnapshot());
    await page.screenshot({ path: `snapshots/${nama}.png`, fullPage: true });
  };

  await bukaDashboard(page);
  await simpan('dashboard');

  const halaman: Rute[] = ['jelajah', 'pengajuan', 'pelaporan', 'arsip', 'katalog', 'biaya', 'notifikasi', 'panduan'];
  for (const rute of halaman) {
    try {
      await page.goto('/');
      await bukaMenu(page, rute);
      await simpan(rute);
    } catch (e) {
      console.log(`Gagal membuka "${rute}":`, (e as Error).message.split('\n')[0]);
    }
  }
});
