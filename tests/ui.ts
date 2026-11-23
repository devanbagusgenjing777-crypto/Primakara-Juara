import { expect, Locator, Page } from '@playwright/test';

/**
 * SATU-SATUNYA tempat selector menu & helper umum.
 * Kalau tampilan aplikasi berbeda dari tebakan di sini, cukup ubah file ini.
 * Cara cari selector yang tepat: npx playwright codegen <BASE_URL>
 */

export const RUTE = {
  pengajuan: ['Lomba', 'Pengajuan'],
  pelaporan: ['Lomba', 'Pelaporan'],
  arsip: ['Lomba', 'Arsip'],
  jelajah: ['Jelajah'],
  katalog: ['Katalog'],
  biaya: ['Biaya'],
  notifikasi: ['Notifikasi'],
  panduan: ['Panduan'],
} as const;
export type Rute = keyof typeof RUTE;

// Indeks kolom (mulai 0) pada tabel daftar. TODO: sesuaikan.
export const KOLOM_NAMA_LOMBA = 1;

export async function bukaDashboard(page: Page) {
  await page.goto('/');
  await expect(page.getByText('Dashboard').first()).toBeVisible();
}

export async function bukaMenu(page: Page, rute: Rute) {
  for (const nama of RUTE[rute]) {
    const item = page
      .getByRole('link', { name: nama, exact: true })
      .or(page.getByRole('button', { name: nama, exact: true }))
      .first();
    await item.click();
  }
  await page.waitForLoadState('load');
}

export const barisTabel = (page: Page): Locator => page.locator('tbody tr');

/** Mengambil angka dari kartu statistik di Dashboard. */
export async function angkaKartu(page: Page, label: string): Promise<number> {
  // .last() = elemen kartu paling dalam yang memuat label
  const kartu = page.locator('[class*="card" i]').filter({ hasText: label }).last();
  await expect(kartu, `Kartu "${label}" tidak tampil`).toBeVisible();
  const teks = (await kartu.innerText()).replace(label, '');
  const m = teks.match(/\d[\d.,]*/);
  expect(m, `Angka pada kartu "${label}" tidak ditemukan`).not.toBeNull();
  return Number(m![0].replace(/[.,]/g, ''));
}

/** Total data pada daftar: dari teks paginasi ("dari 25"), atau jumlah baris jika satu halaman. */
export async function totalData(page: Page): Promise<number> {
  const info = page.getByText(/(dari|of|total)\s+\d+/i).first();
  if (await info.isVisible().catch(() => false)) {
    const m = (await info.innerText()).match(/(?:dari|of|total)\s+(\d+)/i);
    if (m) return Number(m[1]);
  }
  return barisTabel(page).count();
}

export async function filterStatus(page: Page, status: string) {
  await page.getByRole('combobox', { name: /status/i }).first().click();
  await page.getByRole('option', { name: status, exact: true }).click();
}

export async function pilihOpsi(page: Page, label: RegExp, opsi: string | RegExp) {
  await page.getByRole('combobox', { name: label }).first().click();
  await page.getByRole('option', { name: opsi }).first().click();
}

export async function cari(page: Page, kata: string) {
  const kolom = page.getByRole('textbox', { name: /cari|search/i }).first();
  await kolom.fill(kata);
  await kolom.press('Enter');
}

export async function bukaDetailBaris(page: Page, baris: Locator) {
  const tombol = baris.getByRole('link', { name: /detail|lihat/i }).or(baris.getByRole('button', { name: /detail|lihat/i }));
  if (await tombol.first().isVisible().catch(() => false)) await tombol.first().click();
  else await baris.click();
  await page.waitForLoadState('load');
}

export async function namaDiBaris(baris: Locator): Promise<string> {
  return (await baris.locator('td').nth(KOLOM_NAMA_LOMBA).innerText()).trim();
}

export const unik = (awalan: string) => `${awalan}-${Date.now()}`;

export async function tungguToastBerhasil(page: Page) {
  await expect(page.getByText(/berhasil|sukses|success/i).first()).toBeVisible();
}
