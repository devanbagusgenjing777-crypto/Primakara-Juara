// =====================================================================
// DITMAWA — Finalisasi lomba (Menunggu Finalisasi → Selesai → Arsip)
// Langkah: Pelaporan → buka lomba → cek laporan hasil → "Tandai Selesai" → cek Arsip
// Data uji : tests/data/finalisasi.data.ts
// Jalankan : npx playwright test tests/ditmawa/finalisasi.spec.ts --project=ditmawa --headed
// Pilih lomba tertentu: isi di .env  LOMBA_ID=70  (kalau kosong → ambil lomba pertama
//                       berstatus "Menunggu Finalisasi" di menu Pelaporan)
// =====================================================================
import { test, expect, type Page } from '@playwright/test';
import { URL_PELAPORAN, URL_ARSIP, STATUS_AWAL, STATUS_AKHIR, BAGIAN_DETAIL, LABEL_LAPORAN, TOMBOL_FINALISASI, TEKS_KUNCI } from '../data/finalisasi.data';
import { bacaLomba, simpanLomba } from '../data/lomba.state';

// alamat mahasiswa (/lomba/70) → alamat Ditmawa (/kemahasiswaan/lomba/70)
const keAlamatDitmawa = (url: string) => {
  const id = url.match(/\/lomba\/(\d+)/)?.[1];
  return id ? `/kemahasiswaan/lomba/${id}` : url;
};

const ID = 'TC-DIT-FINAL';
const langkah = (m: string) => console.log(`   ➡️  ${m}`);

// Menghitung teks status persis di halaman (abaikan dropdown/menu)
async function hitungStatus(page: Page, status: string): Promise<number> {
  return page.evaluate((s) => {
    return [...document.querySelectorAll('body *')]
      .filter((e) => e.children.length === 0 && (e.textContent || '').trim() === s)
      .filter((e) => !e.closest('select, option, nav, aside, [role="tab"], [role="listbox"], [role="option"], [role="menu"]')).length;
  }, status);
}

async function jumlahSelesaiDiArsip(page: Page): Promise<number> {
  let total = 0;
  for (let hal = 1; hal <= 50; hal++) {
    await page.goto(`${URL_ARSIP}?page=${hal}`);
    await page.waitForLoadState('networkidle');
    const n = await hitungStatus(page, STATUS_AKHIR);
    const semua = await page.evaluate(() => document.querySelectorAll('main a[href*="/lomba/"]').length);
    if (n === 0 && semua === 0 && hal > 1) break;
    total += n;
    if (n === 0 && hal > 1) break;
  }
  return total;
}

test(`${ID} — Ditmawa menandai lomba selesai (masuk Arsip)`, async ({ page }) => {
  console.log(`\n🚦 [${ID}] Finalisasi lomba oleh Ditmawa`);

  // 1) Cari lomba berstatus Menunggu Finalisasi di menu Pelaporan
  // Prioritas: LOMBA_ID di .env → lomba terakhir dari pasca.lomba.spec.ts → cari di Pelaporan
  let urlDetail = process.env.LOMBA_ID ? `/kemahasiswaan/lomba/${process.env.LOMBA_ID}` : '';
  const catatan = bacaLomba();
  if (!urlDetail && catatan?.status === STATUS_AWAL) {
    urlDetail = keAlamatDitmawa(catatan.url);
    langkah(`🔗 Memakai lomba dari pasca.lomba.spec.ts (dicatat ${catatan.waktu})`);
  }
  if (!urlDetail) {
    langkah(`📚 Membuka menu Pelaporan, mencari lomba "${STATUS_AWAL}"`);
    await page.goto(URL_PELAPORAN);
    await page.waitForLoadState('networkidle');
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
    }, STATUS_AWAL);
    test.skip(!href, `Tidak ada lomba berstatus "${STATUS_AWAL}". Jalankan dulu pasca.lomba.spec.ts (TC-MHS-007).`);
    urlDetail = new URL(href!, page.url()).pathname;
  }
  langkah(`🎯 Lomba terpilih: ${urlDetail}`);

  // 2) Catat jumlah "Selesai" di Arsip sebelum finalisasi
  const sebelum = await jumlahSelesaiDiArsip(page);
  langkah(`🗄️ Arsip sebelum: ${sebelum} lomba berstatus ${STATUS_AKHIR}`);

  // 3) Buka detail dan cek laporan hasil sudah lengkap
  await page.goto(urlDetail);
  await page.waitForLoadState('networkidle');
  for (const b of BAGIAN_DETAIL) {
    await expect(page.getByText(b, { exact: true }).first(), `❌ Bagian "${b}" tidak tampil`).toBeVisible();
  }
  for (const l of LABEL_LAPORAN) {
    await expect(page.getByText(l, { exact: true }).first(), `❌ Isian laporan "${l}" tidak tampil`).toBeVisible();
  }
  langkah('📄 Laporan hasil lengkap');

  // 4) Tandai selesai (konfirmasi kalau ada dialog)
  const tombol = page.getByRole('button', { name: TOMBOL_FINALISASI });
  await expect(tombol, `❌ Tombol "${TOMBOL_FINALISASI}" tidak ditemukan`).toBeVisible();
  await expect(page.getByText(TEKS_KUNCI)).toBeVisible();
  await tombol.click();
  langkah('✅ Klik "Tandai Selesai"');

  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible({ timeout: 300_000 }).catch(() => false)) {
    langkah('🔔 Ada dialog konfirmasi, melanjutkan');
    await dialog
      .getByRole('button', { name: /selesai|ya|konfirmasi|lanjut/i })
      .last()
      .click();
  }

  // 5) Setelah selesai: tombol hilang (data terkunci)
  await expect(tombol, '❌ Tombol "Tandai Selesai" masih ada setelah finalisasi').toBeHidden();

  // 6) Arsip bertambah 1
  const sesudah = await jumlahSelesaiDiArsip(page);
  langkah(`🗄️ Arsip sesudah: ${sesudah} lomba berstatus ${STATUS_AKHIR}`);
  expect(sesudah, `❌ Arsip tidak bertambah (sebelum ${sebelum}, sesudah ${sesudah})`).toBe(sebelum + 1);

  simpanLomba(urlDetail, STATUS_AKHIR);
  console.log(`✅🎉 [${ID}] BERHASIL — ${urlDetail} ditandai Selesai dan masuk Arsip (${sebelum} → ${sesudah})`);
});
