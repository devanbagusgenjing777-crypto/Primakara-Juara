import { test, expect, type Page } from '@playwright/test';
import { barisTabel, bukaMenu, cari, namaDiBaris, tungguToastBerhasil } from '../ui';
import { dataKatalog } from '../data/katalog';

// CRUD katalog saling bergantung, jadi dijalankan berurutan (serial).
test.describe.configure({ mode: 'serial' });

const { valid, ubah } = dataKatalog;

// Tombol/link aksi di kolom AKSI (bisa berupa button atau link)
const aksi = (baris: ReturnType<typeof barisTabel>, nama: RegExp) =>
  baris.getByRole('button', { name: nama }).or(baris.getByRole('link', { name: nama })).first();

// Dropdown di form ini adalah <select> native: <option> tidak bisa di-click,
// harus dipilih lewat selectOption().
const pilihSelect = (page: Page, label: RegExp, teks: string) =>
  page.getByRole('combobox', { name: label }).first().selectOption({ label: teks });

test.describe('Ditmawa › Katalog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await bukaMenu(page, 'katalog');
    await expect(page.getByRole('heading', { name: /katalog lomba/i })).toBeVisible();
  });

  test('TC-DIT-020 Cari data katalog', async ({ page }) => {
    test.skip((await barisTabel(page).count()) === 0, 'Katalog masih kosong');
    const nama = await namaDiBaris(barisTabel(page).first());
    await cari(page, nama);
    await expect(barisTabel(page).filter({ hasText: nama }).first()).toBeVisible();
  });

  test('TC-DIT-021 Tambah katalog dengan data valid', async ({ page }) => {
    await page
      .getByRole('button', { name: /buat katalog baru/i })
      .or(page.getByRole('link', { name: /buat katalog baru/i }))
      .first()
      .click();

    await page.getByLabel(/nama lomba/i).fill(valid.nama);
    await page.getByLabel(/penyelenggara/i).fill(valid.penyelenggara);
    // Label "Deskripsi" & "Link Detail" tidak terhubung ke inputnya, jadi pakai placeholder
    await page.getByPlaceholder(/ceritakan tentang lomba/i).fill(valid.deskripsi);
    await page.getByPlaceholder(/instagram \/ website \/ drive lomba/i).fill(valid.linkDetail);
    await pilihSelect(page, /kategori/i, valid.kategori);
    await pilihSelect(page, /tingkat/i, valid.tingkat);
    // Tiga input tanggal (type=date), urutannya: dibuka, ditutup, pelaksanaan. Format yyyy-mm-dd
    const tgl = page.locator('input[type="date"]');
    await tgl.nth(0).fill(valid.pendaftaranDibuka);
    await tgl.nth(1).fill(valid.pendaftaranDitutup);
    await tgl.nth(2).fill(valid.tanggalPelaksanaan);
    await page.getByRole('button', { name: /simpan katalog/i }).click();
    await tungguToastBerhasil(page);

    await cari(page, valid.nama);
    await expect(barisTabel(page).filter({ hasText: valid.nama }).first()).toBeVisible();
  });

  test('TC-DIT-022 Ubah data katalog', async ({ page }) => {
    await cari(page, valid.nama);
    const baris = barisTabel(page).filter({ hasText: valid.nama }).first();
    await aksi(baris, /^edit$|ubah/i).click();
    await page.getByLabel(/nama lomba/i).fill(ubah.nama);
    await page.getByRole('button', { name: /simpan/i }).click();
    await tungguToastBerhasil(page);

    await cari(page, ubah.nama);
    await expect(barisTabel(page).filter({ hasText: ubah.nama }).first()).toBeVisible();
  });

  test('TC-DIT-023 Hapus katalog', async ({ page }) => {
    await cari(page, ubah.nama);
    const baris = barisTabel(page).filter({ hasText: ubah.nama }).first();
    await aksi(baris, /hapus/i).click();

    // Konfirmasi dibatasi ke dialog supaya tidak salah klik tombol "Hapus" di baris tabel
    const dialog = page.getByRole('dialog').or(page.getByRole('alertdialog')).first();
    await dialog.getByRole('button', { name: /ya|hapus|konfirmasi/i }).last().click();
    await tungguToastBerhasil(page);

    await cari(page, ubah.nama);
    await expect(barisTabel(page).filter({ hasText: ubah.nama })).toHaveCount(0);
  });
});