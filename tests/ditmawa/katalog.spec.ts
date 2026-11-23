import { test, expect } from '@playwright/test';
import { barisTabel, bukaMenu, cari, namaDiBaris, pilihOpsi, tungguToastBerhasil, unik } from '../ui';

// CRUD katalog saling bergantung, jadi dijalankan berurutan (serial).
test.describe.configure({ mode: 'serial' });

const namaAwal = unik('QA-Katalog');
const namaUbah = `${namaAwal}-ubah`;

test.describe('Ditmawa › Katalog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await bukaMenu(page, 'katalog');
  });

  test('TC-DIT-020 Cari data katalog', async ({ page }) => {
    test.skip((await barisTabel(page).count()) === 0, 'Katalog masih kosong');
    const nama = await namaDiBaris(barisTabel(page).first());
    await cari(page, nama);
    await expect(barisTabel(page).filter({ hasText: nama }).first()).toBeVisible();
  });

  test('TC-DIT-021 Tambah katalog dengan data valid', async ({ page }) => {
    await page.getByRole('button', { name: /tambah/i }).click();
    await page.getByLabel(/nama lomba/i).fill(namaAwal);
    await page.getByLabel(/penyelenggara/i).fill('QA Penyelenggara');
    await pilihOpsi(page, /kategori/i, /./);
    await pilihOpsi(page, /tingkat/i, /./);
    await page.getByRole('button', { name: /simpan/i }).click();
    await tungguToastBerhasil(page);

    await cari(page, namaAwal);
    await expect(barisTabel(page).filter({ hasText: namaAwal }).first()).toBeVisible();
  });

  test('TC-DIT-022 Ubah data katalog', async ({ page }) => {
    await cari(page, namaAwal);
    const baris = barisTabel(page).filter({ hasText: namaAwal }).first();
    await baris.getByRole('button', { name: /edit|ubah/i }).or(baris.getByRole('link', { name: /edit|ubah/i })).first().click();
    await page.getByLabel(/nama lomba/i).fill(namaUbah);
    await page.getByRole('button', { name: /simpan/i }).click();
    await tungguToastBerhasil(page);

    await cari(page, namaUbah);
    await expect(barisTabel(page).filter({ hasText: namaUbah }).first()).toBeVisible();
  });

  test('TC-DIT-023 Hapus katalog', async ({ page }) => {
    await cari(page, namaUbah);
    const baris = barisTabel(page).filter({ hasText: namaUbah }).first();
    await baris.getByRole('button', { name: /hapus/i }).click();
    await page.getByRole('button', { name: /ya|hapus|konfirmasi/i }).last().click();
    await tungguToastBerhasil(page);

    await cari(page, namaUbah);
    await expect(barisTabel(page).filter({ hasText: namaUbah })).toHaveCount(0);
  });
});
