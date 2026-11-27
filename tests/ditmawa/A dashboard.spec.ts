// =====================================================================
// A. DASHBOARD — role Ditmawa (Direktorat Kemahasiswaan)
// Test case : TC-DIT-001 s.d. TC-DIT-010 (file "Test case Ditmawa", bagian A)
// Data uji  : tests/data/a-dashboard.data.ts
// Jalankan  : npx playwright test tests/ditmawa/a-dashboard.spec.ts --project=ditmawa --headed
// =====================================================================
import { test, expect, type Page, type Browser } from '@playwright/test';
import {
  JUDUL_DASHBOARD, KARTU, BAGIAN, PESAN_KOSONG, SUMBER_HITUNGAN, SEMUA_STATUS,
  LOMBA_TERBARU, PERINGKAT_DIHARAPKAN, TAMPILAN, ENV_STORAGE_KOSONG, MAKS_HALAMAN_SUMBER, TAMBAHAN_TAK_TERLIHAT,
  type KunciKartu, type Halaman, type Status, type Baris,
} from '../data/a-dashboard.data';

// Tidak serial: kalau satu test gagal, test berikutnya tetap dijalankan (hasil hitungan di-cache di memori).

// ---------------------------------------------------------------------
// Pesan terminal
// ---------------------------------------------------------------------
const info = (m: string) => console.log(`   ${m}`);
const mulai = (id: string, judul: string) => console.log(`\n🚦 [${id}] ${judul}`);
const lulus = (id: string, m: string) => console.log(`✅ [${id}] LULUS — ${m}`);

// ---------------------------------------------------------------------
// Buka Dashboard
// ---------------------------------------------------------------------
async function bukaDashboard(page: Page) {
  const heading = page.getByText(JUDUL_DASHBOARD, { exact: true }).first();
  await page.goto(process.env.DASHBOARD_URL || '/');
  if (!(await heading.isVisible({ timeout: 5_000 }).catch(() => false))) {
    // kalau '/' tidak langsung ke Dashboard, klik menu Dashboard di sidebar
    await page.getByRole('link', { name: /^Dashboard$/ }).first().click();
  }
  await expect(heading, 'Judul "Dashboard Kemahasiswaan" harus tampil').toBeVisible();
  // tunggu angka kartu selesai dimuat
  await expect.poll(() => bacaTeksKartu(page, 'menungguPersetujuan'), { timeout: 15_000 }).toMatch(/\d/);
}

// ---------------------------------------------------------------------
// Membaca isi satu bagian di Dashboard.
// Cara kerja: cari teks judul → naik ke elemen induk sampai induk berikutnya
// sudah memuat judul bagian LAIN. Jadi tidak bergantung pada class CSS.
// ---------------------------------------------------------------------
const JUDUL_BAGIAN = [BAGIAN.lombaTerbaru, BAGIAN.perluTindakLanjut, BAGIAN.papanPeringkat, BAGIAN.partisipasi, BAGIAN.juara];
const LABEL_KARTU = Object.values(KARTU) as string[];

async function bacaBagian(page: Page, judul: string, urutan: 'pertama' | 'terakhir', batas: string[]): Promise<string> {
  return page.evaluate(
    ({ judul, urutan, batas }) => {
      const cocok = [...document.querySelectorAll('body *')].filter(
        (e) => e.children.length === 0 && (e.textContent || '').trim() === judul,
      );
      const el = (urutan === 'pertama' ? cocok[0] : cocok[cocok.length - 1]) as HTMLElement | undefined;
      if (!el) return '';
      let cur: HTMLElement = el;
      while (cur.parentElement && cur.parentElement !== document.body) {
        const t = cur.parentElement.innerText || '';
        if (batas.some((b) => t.includes(b))) break;
        cur = cur.parentElement;
      }
      return cur.innerText || '';
    },
    { judul, urutan, batas },
  );
}

const bacaTeksKartu = (page: Page, k: KunciKartu) =>
  bacaBagian(page, KARTU[k], 'pertama', [...LABEL_KARTU.filter((l) => l !== KARTU[k]), ...JUDUL_BAGIAN]);

async function bacaAngkaKartu(page: Page, k: KunciKartu): Promise<number> {
  const teks = (await bacaTeksKartu(page, k)).replace(KARTU[k], '');
  const m = teks.match(/\d[\d.,]*/);
  if (!m) throw new Error(`Angka pada kartu "${KARTU[k]}" tidak ditemukan. Teks kartu: "${teks.trim()}"`);
  return parseInt(m[0].replace(/[.,]/g, ''), 10);
}

const bacaSectionLomba = (page: Page, judul: string, urutan: 'pertama' | 'terakhir' = 'pertama') =>
  bacaBagian(page, judul, urutan, JUDUL_BAGIAN.filter((j) => j !== judul));

// ---------------------------------------------------------------------
// Menghitung "data aktual" dari daftar di menu Lomba
// ---------------------------------------------------------------------
const cacheUrl: Partial<Record<Halaman, string>> = {};
const cacheHitung: Partial<Record<Halaman, Record<string, number>>> = {};

async function urlHalaman(page: Page, halaman: Halaman): Promise<string> {
  if (cacheUrl[halaman]) return cacheUrl[halaman]!;
  if (halaman === 'Pengajuan') return (cacheUrl[halaman] = '/kemahasiswaan/lomba');
  const dariEnv = process.env[`URL_${halaman.toUpperCase()}`];
  if (dariEnv) return (cacheUrl[halaman] = dariEnv);

  await bukaDashboard(page);
  const link = page.getByRole('link', { name: halaman, exact: true }).first();
  if (!(await link.isVisible().catch(() => false))) {
    await page.getByRole('link', { name: /^Lomba$/ }).or(page.getByRole('button', { name: /^Lomba$/ })).first().click();
  }
  await link.click();
  await page.waitForLoadState('networkidle');
  const u = new URL(page.url());
  return (cacheUrl[halaman] = u.pathname);
}

// Membaca halaman 1, 2, 3, ... sampai halaman kosong, lalu menghitung teks status
// dengan SATU evaluate per halaman (abaikan dropdown/menu/tab).
async function hitungStatus(page: Page, halaman: Halaman): Promise<Record<string, number>> {
  if (cacheHitung[halaman]) return cacheHitung[halaman]!;
  const dasar = await urlHalaman(page, halaman);
  const total: Record<string, number> = Object.fromEntries(SEMUA_STATUS.map((s) => [s, 0]));
  info(`📚 Membaca menu "${halaman}" (${dasar})`);

  let terbaca = 0;
  for (let hal = 1; hal <= MAKS_HALAMAN_SUMBER; hal++) {
    await page.goto(hal === 1 ? dasar : `${dasar}?page=${hal}`);
    await page.waitForLoadState('networkidle');
    const { kartu, hitung } = await page.evaluate((semua) => {
      const ids = new Set(
        [...document.querySelectorAll('a[href*="/lomba/"]')]
          .map((a) => a.getAttribute('href')?.match(/\/lomba\/(\d+)/)?.[1])
          .filter(Boolean),
      );
      const hitung: Record<string, number> = {};
      const leaf = [...document.querySelectorAll('body *')]
        .filter((e) => e.children.length === 0)
        .filter((e) => !e.closest('select, option, nav, aside, [role="tab"], [role="listbox"], [role="option"], [role="menu"]'));
      for (const s of semua) hitung[s] = leaf.filter((e) => (e.textContent || '').trim() === s).length;
      return { kartu: ids.size, hitung };
    }, [...SEMUA_STATUS]);

    if (kartu === 0 && hal > 1) { info(`   📭 halaman ${hal} kosong — selesai (${hal - 1} halaman)`); break; }
    terbaca = hal;
    for (const s of SEMUA_STATUS) total[s] += hitung[s] ?? 0;
  }
  info(`   hasil (${terbaca} halaman): ${SEMUA_STATUS.filter((s) => total[s]).map((s) => `${s}=${total[s]}`).join(', ') || 'tidak ada data'}`);
  return (cacheHitung[halaman] = total);
}

async function hitungAktual(page: Page, k: KunciKartu): Promise<number> {
  let jumlah = 0;
  for (const sumber of SUMBER_HITUNGAN[k]) {
    const hasil = await hitungStatus(page, sumber.halaman);
    for (const s of sumber.status as Status[]) jumlah += hasil[s] ?? 0;
  }
  // Lomba yang dihitung Dashboard tetapi tidak tampil di daftar Ditmawa
  // (mis. "Menunggu Laporan Hasil"). Bisa ditimpa lewat .env: LOMBA_MENUNGGU_LAPORAN=2
  let tambahan = TAMBAHAN_TAK_TERLIHAT[k] ?? 0;
  if (k === 'lombaAktif' && process.env.LOMBA_MENUNGGU_LAPORAN !== undefined) {
    tambahan = Number(process.env.LOMBA_MENUNGGU_LAPORAN);
  }
  if (tambahan) info(`➕ Tambahan lomba tak terlihat di daftar: ${tambahan}`);
  return jumlah + tambahan;
}

// ---------------------------------------------------------------------
// Membaca baris peringkat dari teks bagian
// Mendukung "Nama 30", "Nama  30 lomba", atau nama & angka di baris terpisah.
// ---------------------------------------------------------------------
function bacaPeringkat(teks: string, judul: string): Baris[] {
  const baris: Baris[] = [];
  const lines = teks.split('\n').map((l) => l.trim()).filter(Boolean).filter((l) => l !== judul);
  let nama = '';
  for (const l of lines) {
    const sebaris = l.match(/^(.*\D)\s+(\d+)(?:\s+[A-Za-z]+)?$/);
    if (sebaris) { baris.push({ nama: sebaris[1].replace(/^\d+[.)]?\s*/, ''), jumlah: Number(sebaris[2]) }); nama = ''; continue; }
    if (/^\d+$/.test(l)) {
      if (nama) { baris.push({ nama, jumlah: Number(l) }); nama = ''; }
      continue; // angka tanpa nama = nomor urut
    }
    nama = l;
  }
  return baris;
}

// =====================================================================
// A. DASHBOARD
// =====================================================================
test.describe('A. Dashboard Ditmawa', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(TAMPILAN.viewport);
    await bukaDashboard(page);
  });

  // ---- Pemeriksaan dasar halaman (bagian dari semua TC) --------------
  test('Dashboard tampil dengan judul, 4 kartu, dan semua bagian', async ({ page }) => {
    mulai('DASAR', 'Dashboard tampil lengkap');
    await expect(page.getByText('Ringkasan aktivitas lomba seluruh mahasiswa')).toBeVisible();
    for (const label of LABEL_KARTU) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    for (const j of [BAGIAN.lombaTerbaru, BAGIAN.perluTindakLanjut, BAGIAN.papanPeringkat, BAGIAN.partisipasi, BAGIAN.juara]) {
      await expect(page.getByText(j, { exact: true }).first(), `Bagian "${j}" harus tampil`).toBeVisible();
    }
    lulus('DASAR', 'judul, 4 kartu statistik, dan 5 bagian tampil');
  });

  // ---- TC-DIT-001 .. 004 : angka kartu vs data aktual ----------------
  const kartuUji: { id: string; kunci: KunciKartu; judul: string }[] = [
    { id: 'TC-DIT-001', kunci: 'menungguPersetujuan', judul: 'Memeriksa jumlah pengajuan menunggu persetujuan' },
    { id: 'TC-DIT-002', kunci: 'menungguFinalisasi', judul: 'Memeriksa jumlah lomba menunggu finalisasi' },
    { id: 'TC-DIT-003', kunci: 'lombaAktif', judul: 'Memeriksa jumlah lomba aktif' },
    { id: 'TC-DIT-004', kunci: 'totalSelesai', judul: 'Memeriksa jumlah lomba selesai' },
  ];

  for (const { id, kunci, judul } of kartuUji) {
    test(`${id} — ${judul}`, async ({ page }) => {
      mulai(id, judul);
      const tampil = await bacaAngkaKartu(page, kunci);
      info(`🔢 Dashboard (kartu "${KARTU[kunci]}"): ${tampil}`);
      const aktual = await hitungAktual(page, kunci);
      info(`🧮 Data aktual di daftar lomba     : ${aktual}`);
      expect(
        tampil,
        `❌ [${id}] Kartu "${KARTU[kunci]}" menampilkan ${tampil}, tetapi data aktual ${aktual}`,
      ).toBe(aktual);
      lulus(id, `kartu "${KARTU[kunci]}" = ${tampil}, sama dengan data aktual`);
    });
  }

  // ---- TC-DIT-005 : Lomba Terbaru ------------------------------------
  test('TC-DIT-005 — Memeriksa informasi lomba terbaru', async ({ page }) => {
    mulai('TC-DIT-005', 'Memeriksa informasi lomba terbaru');
    const teks = await bacaSectionLomba(page, BAGIAN.lombaTerbaru);
    if (teks.includes(PESAN_KOSONG.lombaTerbaru)) {
      info('ℹ️ Belum ada aktivitas lomba — tidak ada data untuk dicocokkan.');
      test.skip(true, 'Lomba Terbaru kosong: jalankan dulu test Mahasiswa (TC-MHS-001..005) agar ada data.');
    }
    info(`📄 Isi Lomba Terbaru:\n${teks.split('\n').map((l) => '      ' + l).join('\n')}`);

    // 1) setiap daftar harus memuat minimal satu status yang valid
    const adaStatus = SEMUA_STATUS.some((s) => teks.includes(s));
    expect(adaStatus, '❌ Tidak ada badge status yang valid di Lomba Terbaru').toBeTruthy();

    // 2) data uji dari test Mahasiswa dicek (soft: lomba baru itu belum tentu masih 5 teratas)
    if (LOMBA_TERBARU.nama) expect.soft(teks, `Nama lomba "${LOMBA_TERBARU.nama}" tidak muncul`).toContain(LOMBA_TERBARU.nama);
    expect.soft(teks.split('\n').filter((l) => l.includes('•')).length, '❌ Tidak ada baris "mahasiswa • universitas" di Lomba Terbaru').toBeGreaterThan(0);
    expect.soft(teks, `Mahasiswa "${LOMBA_TERBARU.mahasiswa}" tidak muncul`).toContain(LOMBA_TERBARU.mahasiswa);
    expect.soft(teks, `Universitas "${LOMBA_TERBARU.universitas}" tidak muncul`).toContain(LOMBA_TERBARU.universitas);
    if (test.info().errors.length === 0) lulus('TC-DIT-005', 'nama lomba, mahasiswa, universitas, dan status tampil sesuai data');
  });

  // ---- TC-DIT-006 : Perlu Tindak Lanjut kosong ------------------------
  test('TC-DIT-006 — Memeriksa kondisi tidak ada tindak lanjut', async ({ page, browser }) => {
    mulai('TC-DIT-006', 'Memeriksa kondisi tidak ada tindak lanjut');
    let teks = await bacaSectionLomba(page, BAGIAN.perluTindakLanjut);

    if (!teks.includes(PESAN_KOSONG.perluTindakLanjut)) {
      const storage = process.env[ENV_STORAGE_KOSONG];
      if (!storage) {
        info('ℹ️ Akun saat ini masih punya tindak lanjut, dan STORAGE_DITMAWA_KOSONG belum diisi di .env.');
        test.skip(true, 'Butuh kondisi tanpa tindak lanjut (selesaikan semua tindak lanjut atau isi STORAGE_DITMAWA_KOSONG).');
      }
      info(`🔁 Memakai sesi akun kosong: ${storage}`);
      const ctx = await (browser as Browser).newContext({ storageState: storage, viewport: TAMPILAN.viewport });
      const p2 = await ctx.newPage();
      await bukaDashboard(p2);
      teks = await bacaSectionLomba(p2, BAGIAN.perluTindakLanjut);
      await ctx.close();
    }
    expect(teks, '❌ Pesan kondisi kosong "Perlu Tindak Lanjut" tidak sesuai').toContain(PESAN_KOSONG.perluTindakLanjut);
    lulus('TC-DIT-006', `muncul pesan "${PESAN_KOSONG.perluTindakLanjut}…"`);
  });

  // ---- TC-DIT-007 : Partisipasi Terbanyak -----------------------------
  test('TC-DIT-007 — Memeriksa peringkat partisipasi terbanyak', async ({ page }) => {
    mulai('TC-DIT-007', 'Memeriksa peringkat partisipasi terbanyak');
    const teks = await bacaBagian(page, BAGIAN.partisipasi, 'pertama', [BAGIAN.juara, BAGIAN.lombaTerbaru, BAGIAN.perluTindakLanjut]);
    const baris = bacaPeringkat(teks, BAGIAN.partisipasi);
    info(`🏅 ${baris.length} baris terbaca: ${baris.map((b) => `${b.nama}=${b.jumlah}`).join(' | ') || '(kosong)'}`);

    expect(baris.length, '❌ Tidak ada baris peringkat partisipasi terbaca. Cek isi teks di atas.').toBeGreaterThan(0);
    for (let i = 1; i < baris.length; i++) {
      expect(baris[i - 1].jumlah, `❌ Urutan salah: "${baris[i - 1].nama}" (${baris[i - 1].jumlah}) di atas "${baris[i].nama}" (${baris[i].jumlah})`)
        .toBeGreaterThanOrEqual(baris[i].jumlah);
    }
    PERINGKAT_DIHARAPKAN.partisipasi.forEach((h, i) => {
      expect(baris[i], `Baris ke-${i + 1} tidak ada`).toBeDefined();
      expect(baris[i].nama).toContain(h.nama);
      expect(baris[i].jumlah, `Jumlah "${h.nama}"`).toBe(h.jumlah);
    });
    lulus('TC-DIT-007', `${baris.length} baris, urutan menurun benar`);
  });

  // ---- TC-DIT-008 : Juara Terbanyak -----------------------------------
  test('TC-DIT-008 — Memeriksa papan peringkat juara terbanyak', async ({ page }) => {
    mulai('TC-DIT-008', 'Memeriksa papan peringkat juara terbanyak');
    const teks = await bacaBagian(page, BAGIAN.juara, 'pertama', [BAGIAN.partisipasi, BAGIAN.lombaTerbaru, BAGIAN.perluTindakLanjut]);

    if (teks.includes(PESAN_KOSONG.juara)) {
      info('📭 Belum ada juara — kondisi kosong ditangani dengan pesan yang benar.');
      expect(PERINGKAT_DIHARAPKAN.juara.length, '❌ Data juara diharapkan ada, tetapi dashboard menampilkan kosong').toBe(0);
      lulus('TC-DIT-008', `kondisi kosong menampilkan "${PESAN_KOSONG.juara}…"`);
      return;
    }
    const baris = bacaPeringkat(teks, BAGIAN.juara);
    info(`🏆 ${baris.length} baris terbaca: ${baris.map((b) => `${b.nama}=${b.jumlah}`).join(' | ')}`);
    expect(baris.length, '❌ Tidak ada baris juara terbaca').toBeGreaterThan(0);
    for (let i = 1; i < baris.length; i++) {
      expect(baris[i - 1].jumlah, `❌ Urutan juara salah di baris ${i}`).toBeGreaterThanOrEqual(baris[i].jumlah);
    }
    PERINGKAT_DIHARAPKAN.juara.forEach((h, i) => {
      expect(baris[i]?.nama).toContain(h.nama);
      expect(baris[i]?.jumlah).toBe(h.jumlah);
    });
    lulus('TC-DIT-008', `${baris.length} baris juara, urutan benar`);
  });

  // ---- TC-DIT-009 : tata letak ----------------------------------------
  test('TC-DIT-009 — Memeriksa tata letak komponen Dashboard', async ({ page }) => {
    mulai('TC-DIT-009', 'Memeriksa tata letak komponen Dashboard');
    const lebar = TAMPILAN.viewport.width;
    const tol = TAMPILAN.toleransiPx;

    // kotak tiap kartu statistik: naik dari teks label sampai induk berikutnya memuat label/judul lain
    const kotak = await page.evaluate(
      ({ labels, batas }) =>
        labels.map((label) => {
          const el = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && (e.textContent || '').trim() === label) as HTMLElement | undefined;
          if (!el) return { nama: label, x: 0, y: 0, w: 0, h: 0 };
          let cur = el;
          const lain = batas.filter((b) => b !== label);
          while (cur.parentElement && cur.parentElement !== document.body) {
            if (lain.some((b) => (cur.parentElement!.innerText || '').includes(b))) break;
            cur = cur.parentElement;
          }
          const r = cur.getBoundingClientRect();
          return { nama: label, x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      { labels: LABEL_KARTU, batas: [...LABEL_KARTU, ...JUDUL_BAGIAN] },
    );

    for (const b of kotak) {
      expect(b.w, `Kartu "${b.nama}" terlalu sempit`).toBeGreaterThan(50);
      expect(b.x, `Kartu "${b.nama}" terpotong di kiri`).toBeGreaterThanOrEqual(-tol);
      expect(b.x + b.w, `Kartu "${b.nama}" terpotong di kanan`).toBeLessThanOrEqual(lebar + tol);
    }
    for (let i = 0; i < kotak.length; i++) {
      for (let j = i + 1; j < kotak.length; j++) {
        const a = kotak[i], b = kotak[j];
        const tumpuk = a.x < b.x + b.w - tol && b.x < a.x + a.w - tol && a.y < b.y + b.h - tol && b.y < a.y + a.h - tol;
        expect(tumpuk, `❌ Kartu "${a.nama}" bertumpuk dengan "${b.nama}"`).toBeFalsy();
      }
    }
    // tidak ada scroll horizontal (tanda ada komponen yang melebar/terpotong)
    const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(sw, '❌ Halaman bisa digeser ke samping (ada komponen terpotong)').toBeLessThanOrEqual(cw + tol);

    for (const j of [BAGIAN.lombaTerbaru, BAGIAN.perluTindakLanjut, BAGIAN.papanPeringkat, BAGIAN.partisipasi, BAGIAN.juara]) {
      await expect(page.getByText(j, { exact: true }).first()).toBeVisible();
    }
    lulus('TC-DIT-009', 'kartu, daftar, tindak lanjut, dan peringkat terlihat, tidak bertumpuk, tidak terpotong');
  });

  // ---- TC-DIT-010 : bagian bawah --------------------------------------
  test('TC-DIT-010 — Memeriksa tampilan bagian bawah Dashboard', async ({ page }) => {
    mulai('TC-DIT-010', 'Memeriksa tampilan bagian bawah Dashboard');

    // Catatan: bagian "Menunggu Persetujuan" bisa sangat panjang (satu kartu per pengajuan),
    // jadi judulnya tidak harus terlihat saat halaman di-scroll sampai dasar. Yang dicek:
    //  (1) dasar halaman bisa dicapai dan isi paling bawah tidak terpotong,
    //  (2) judul bagian tetap bisa dicapai dengan scroll dan tampil di layar.
    const bawah = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      // scroll juga kontainer yang bisa di-scroll (kalau Dashboard memakai scroll internal)
      for (const el of document.querySelectorAll('main, [class*="overflow"]')) {
        const e = el as HTMLElement;
        if (e.scrollHeight > e.clientHeight + 5) e.scrollTop = e.scrollHeight;
      }
      const sisa = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      let maks = 0;
      for (const e of document.querySelectorAll('body *')) {
        if (e.children.length > 0 || !(e.textContent || '').trim()) continue;
        const r = (e as HTMLElement).getBoundingClientRect();
        if (r.height > 0 && r.width > 0) maks = Math.max(maks, r.bottom);
      }
      return { sisa, bawahIsi: maks, tinggiLayar: window.innerHeight };
    });
    info(`📏 dasar halaman: sisa scroll=${Math.round(bawah.sisa)}, isi paling bawah di y=${Math.round(bawah.bawahIsi)} (tinggi layar ${bawah.tinggiLayar})`);
    expect(bawah.sisa, '❌ Halaman belum mencapai bagian paling bawah').toBeLessThanOrEqual(5);
    expect(bawah.bawahIsi, '❌ Isi paling bawah terpotong di luar layar').toBeLessThanOrEqual(bawah.tinggiLayar + TAMPILAN.toleransiPx);
    expect(bawah.bawahIsi, '❌ Tidak ada isi yang terlihat di bagian bawah').toBeGreaterThan(0);

    const hasil = await page.evaluate(({ judul, sub }) => {
      const leaf = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && (e.textContent || '').trim() === judul);
      const el = leaf[leaf.length - 1] as HTMLElement | undefined;
      if (!el) return { ada: false } as const;
      el.scrollIntoView({ block: 'start' });
      const r = el.getBoundingClientRect();
      const norm = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase();
      const adaSub = norm(document.body.innerText).includes(norm(sub));
      const sekitar = ((el.parentElement?.parentElement?.innerText || el.parentElement?.innerText || '') as string).replace(/\s+/g, ' ').slice(0, 160);
      return { ada: true as const, atas: r.top, bawah: r.bottom, tinggiLayar: window.innerHeight, adaSub, sekitar };
    }, { judul: BAGIAN.judulMenunggu, sub: BAGIAN.subJudulMenunggu });

    expect(hasil.ada, `❌ Judul bagian "${BAGIAN.judulMenunggu}" tidak ditemukan`).toBeTruthy();
    if (!hasil.ada) return;
    info(`📍 judul bagian: atas=${Math.round(hasil.atas)} bawah=${Math.round(hasil.bawah)} (tinggi layar ${hasil.tinggiLayar})`);
    expect(hasil.atas, '❌ Judul berada di luar layar (atas)').toBeGreaterThanOrEqual(-TAMPILAN.toleransiPx);
    expect(hasil.bawah, '❌ Judul berada di luar layar (bawah)').toBeLessThanOrEqual(hasil.tinggiLayar + TAMPILAN.toleransiPx);
    if (!hasil.adaSub) info(`🔎 Teks di sekitar judul: "${hasil.sekitar}"`);
    expect(hasil.adaSub, `❌ Sub judul "${BAGIAN.subJudulMenunggu}" tidak tampil. Cocokkan teks sub judul di a-dashboard.data.ts (BAGIAN.subJudulMenunggu) dengan teks di atas.`).toBeTruthy();

    // isi bagian bawah: pesan kosong, atau minimal satu tombol Setujui / teks isi
    const teks = await bacaBagian(page, BAGIAN.judulMenunggu, 'terakhir', [...JUDUL_BAGIAN, ...LABEL_KARTU.filter((l) => l !== BAGIAN.judulMenunggu)]);
    const kosong = teks.includes(PESAN_KOSONG.menungguPersetujuan);
    const ada = await page.getByRole('button', { name: 'Setujui' }).count().catch(() => 0);
    info(kosong ? '📭 Tidak ada pengajuan menunggu persetujuan (pesan kosong tampil).' : `📋 Ada ${ada} pengajuan menunggu persetujuan.`);
    expect(kosong || ada > 0 || teks.length > BAGIAN.judulMenunggu.length + 40, '❌ Isi bagian bawah tidak tampil').toBeTruthy();
    lulus('TC-DIT-010', 'bagian "Menunggu Persetujuan" dapat dicapai lewat scroll dan tampil baik');
  });
});