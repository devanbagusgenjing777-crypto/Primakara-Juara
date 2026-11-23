import { test as setup, expect, Page } from '@playwright/test';

function ambil(nama: string) {
  const v = process.env[nama];
  if (!v) throw new Error(`Isi ${nama} di file .env`);
  return v;
}

async function loginSSO(page: Page, user: string, pass: string) {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Masuk dengan Primakara SSO' }).click();
  await page.getByRole('textbox', { name: 'Email atau NIM' }).fill(user);
  await page.getByRole('textbox', { name: 'Password' }).fill(pass);
  await page.getByRole('button', { name: 'Log in' }).click();
}

setup('TC-LOGIN-DIT-001 Login Ditmawa (SSO) dan simpan sesi', async ({ page }) => {
  await loginSSO(page, ambil('DITMAWA_USER'), ambil('DITMAWA_PASS'));
  await page.getByRole('button', { name: 'Direktorat Kemahasiswaan' }).click();
  await expect(page.getByText('Dashboard').first()).toBeVisible({ timeout: 30_000 });
  await page.context().storageState({ path: '.auth/ditmawa.json' });
});

setup('TC-LOGIN-MHS-001 Login Mahasiswa (SSO) dan simpan sesi', async ({ page }) => {
  await loginSSO(page, ambil('MAHASISWA_USER'), ambil('MAHASISWA_PASS'));

  // kalau muncul pilihan peran, pilih Mahasiswa (aman kalau tidak muncul)
  const pilihMhs = page.getByRole('button', { name: /mahasiswa/i });
  if (await pilihMhs.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await pilihMhs.click();
  }

  // tunggu sampai benar-benar masuk, baru simpan sesi
  await expect(page.getByText('Dashboard').first()).toBeVisible({ timeout: 30_000 });
  await page.context().storageState({ path: '.auth/mahasiswa.json' });
});