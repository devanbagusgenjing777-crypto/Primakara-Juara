import { test, expect, Page } from '@playwright/test';
import { kasus, Pengajuan } from '../data/pengajuan.data';
import { simpanLomba } from '../data/lomba.state';

// tanggal: hari ini + offset, format yyyy-mm-dd (format input type="date")
const tgl = (plus: number) => {
  const d = new Date();
  d.setDate(d.getDate() + plus);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const lanjut = (page: Page) => page.getByRole('button', { name: 'Lanjut' }).click();

// ---------- pesan terminal ----------
let langkahSekarang = '';
const langkah = (d: Pengajuan, no: number, nama: string, emoji: string) => {
  langkahSekarang = `langkah ${no}/6 (${nama})`;
  console.log(`🏃💨 [${d.id}] Langkah ${no}/6 · ${nama} ${emoji}`);
};
const ringkasTipe = (d: Pengajuan) => `${d.jenis} • ${d.tingkat} • ${d.pelaksanaan}${d.lokasi ? ` (${d.lokasi})` : ''}` + ` • dosen: ${d.dosen ? 'Ya' : 'Tidak'} • dispensasi: ${d.dispensasi ? 'Ya' : 'Tidak'}`;

// langkah 1 (Tim) + isi langkah 2 (Detail), tanpa klik Lanjut terakhir
async function isiTimDanDetail(page: Page, d: Pengajuan) {
  langkah(d, 1, 'Tim', '👥');
  await page.getByRole('button', { name: '1. Tim' }).click();
  await lanjut(page);
  await expect(page.getByLabel('Nama Lomba')).toBeVisible();

  langkah(d, 2, 'Detail', '📝');
  await page.getByLabel('Nama Lomba').fill(d.nama);
  await page.getByRole('button', { name: d.jenis, exact: true }).click();
  await page.getByLabel('Penyelenggara').fill(d.penyelenggara);
  await page.getByLabel(/Link/i).fill(d.link);
  await page.locator('input[type=file]').first().setInputFiles(d.poster);
  await page.getByRole('button', { name: d.bersamaTeman ? 'Ya' : 'Tidak', exact: true }).click();
}

async function isiWizard(page: Page, d: Pengajuan) {
  await isiTimDanDetail(page, d);
  await lanjut(page);

  langkah(d, 3, 'Jadwal', '📅');
  await page.getByLabel('Tanggal Daftar').fill(tgl(d.hariDaftar));
  await page.getByLabel('Tanggal Pelaksanaan').fill(tgl(d.hariPelaksanaan));
  await page.getByLabel('Tanggal Pengumuman').fill(tgl(d.hariPengumuman));
  await page.getByRole('button', { name: d.kategori, exact: true }).click();
  await page.getByRole('button', { name: d.tingkat, exact: true }).click();
  await page.getByRole('button', { name: d.prestise, exact: true }).click();
  await page.getByRole('button', { name: d.peserta, exact: true }).click();
  await lanjut(page);

  langkah(d, 4, 'Pelaksanaan', '🏟️');
  await page.getByRole('button', { name: d.pelaksanaan, exact: true }).click(); // Online / Offline
  if (d.lokasi) await page.getByRole('button', { name: d.lokasi, exact: true }).click();
  await page.getByLabel('Jumlah Mahasiswa Primakara Ikut').fill(String(d.jmlPrimakara));
  await page.getByLabel('Jumlah Seluruh Peserta Lomba').fill(String(d.jmlPeserta));
  await page.getByRole('button', { name: d.dosen ? 'Ya' : 'Tidak', exact: true }).click();
  if (d.dosen) {
    const cari = page.getByRole('textbox', { name: /Cari Dosen Pendamping/i });
    const sudahPilih = page.getByText('Ganti', { exact: true });
    await cari.or(sudahPilih).first().waitFor();
    if (await cari.isVisible()) {
      await cari.fill(d.dosenCari);
      await page.getByText(d.dosenNama, { exact: false }).first().click();
    }
    await expect(page.getByText(d.dosenNama, { exact: false }).first()).toBeVisible();
  }
  await lanjut(page);

  langkah(d, 5, 'Biaya', '💰');
  await page.getByLabel(/Biaya Pendaftaran/i).fill(d.biaya);
  await page.locator('input[type=file]').last().setInputFiles(d.poster);
  if (d.dispensasi) {
    await page.getByRole('button', { name: 'Ya', exact: true }).click();
    await page.getByRole('textbox', { name: 'Tanggal Surat Dispensasi' }).fill(tgl(d.hariPelaksanaan));
  }
  await lanjut(page);
}

for (const d of kasus) {
  test(`${d.id} ${d.judul}`, async ({ page }) => {
    test.setTimeout(180_000);
    langkahSekarang = '';

    console.log(`\n🚀 [${d.id}] Mulai: ${d.judul}`);
    console.log(`   🏷️  Tipe: ${ringkasTipe(d)}`);

    try {
      // buka form pengajuan BARU dari menu Lomba → Pengajuan
      await page.goto('/dashboard');
      await page.getByRole('link', { name: 'Pengajuan', exact: true }).click();
      await page
        .getByRole('link', { name: /ajukan|buat|tambah|baru/i })
        .or(page.getByRole('button', { name: /ajukan|buat|tambah|baru/i }))
        .first()
        .click();
      await expect(page).toHaveURL(/\/lomba\/\d+\/wizard\//); // wizard terbuka
      const idLomba = page.url().match(/\/lomba\/(\d+)\//)?.[1] ?? '?';
      console.log(`🆕 [${d.id}] Draft pengajuan #${idLomba} dibuka`);

      await isiWizard(page, d); // semua langkah, nama sesuai data (bisa kosong)

      langkah(d, 6, 'Review & Kirim', '🔎');
      await page.getByRole('button', { name: 'Kirim Pengajuan' }).click();

      if (d.hasil === 'sukses') {
        await expect(page.getByText('Diajukan').first()).toBeVisible();
        console.log(`✅🎉 [${d.id}] BERHASIL membuat pengajuan #${idLomba} → status: Diajukan`);
        console.log(`   🏷️  Tipe: ${ringkasTipe(d)}`);

        // catat lomba ini supaya tahap berikutnya (persetujuan, pasca, laporan, finalisasi) memakai lomba yang sama
        expect(idLomba, '❌ ID lomba tidak ditemukan dari URL wizard').not.toBe('?');
        simpanLomba(`/lomba/${idLomba}`, 'Diajukan');
        
      } else {
        // kasus negatif: pengajuan ditolak sistem dan pesan error muncul
        await expect(page.getByText(/Periksa kembali data Anda/i)).toBeVisible();
        await expect(page.getByText('Diajukan')).toHaveCount(0);
        console.log(`🛡️✅ [${d.id}] LULUS — sistem menolak pengajuan seperti yang diharapkan`);
        console.log(`   🏷️  Skenario: ${d.judul}`);
      }
    } catch (e) {
      const pesan = (e as Error).message.split('\n')[0];
      console.log(`❌💥 [${d.id}] GAGAL pada ${langkahSekarang || 'tahap awal'}: ${pesan}`);
      throw e;
    }
  });
}
