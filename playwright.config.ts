import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    // ---------- LOGIN (simpan sesi) ----------
    { name: 'setup-ditmawa',   testMatch: /auth\.setup\.ts/, grep: /TC-LOGIN-DIT/ },
    { name: 'setup-mahasiswa', testMatch: /auth\.setup\.ts/, grep: /TC-LOGIN-MHS/ },

    // ---------- PROJECT BIASA (tetap seperti semula) ----------
    {
      name: 'ditmawa',
      testDir: './tests/ditmawa',
      dependencies: ['setup-ditmawa'],
      use: { storageState: '.auth/ditmawa.json' },
    },
    {
      name: 'mahasiswa',
      testDir: './tests/mahasiswa',
      dependencies: ['setup-mahasiswa'],
      use: { storageState: '.auth/mahasiswa.json' },
    },

    // ---------- END-TO-END (berurutan) ----------
    {
      name: 'e2e-1-pengajuan',
      testMatch: /mahasiswa[\\/]pengajuan\.lomba\.spec\.ts/i,
      dependencies: ['setup-mahasiswa'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/mahasiswa.json' },
    },
    {
      name: 'e2e-2-persetujuan',
      testMatch: /ditmawa[\\/]persetujuan\.spec\.ts/i,
      dependencies: ['e2e-1-pengajuan', 'setup-ditmawa'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/ditmawa.json' },
    },
    {
      name: 'e2e-3-pasca-laporan',
      testMatch: /mahasiswa[\\/]pasca\.lomba\.spec\.ts/i,
      dependencies: ['e2e-2-persetujuan'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/mahasiswa.json' },
    },
    {
      name: 'e2e-4-finalisasi',
      testMatch: /ditmawa[\\/]finalisasi\.spec\.ts/i,
      dependencies: ['e2e-3-pasca-laporan'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/ditmawa.json' },
    },
  ],
});