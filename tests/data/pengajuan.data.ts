export type Pengajuan = {
  id: string;
  judul: string;
  nama: string;
  jenis: string;
  penyelenggara: string;
  link: string;
  poster: string;
  bersamaTeman: boolean;
  hariDaftar: number;
  hariPelaksanaan: number;
  hariPengumuman: number;
  kategori: string;
  tingkat: string;
  prestise: string;
  peserta: string;
  pelaksanaan: 'Offline' | 'Online';
  lokasi: string;
  jmlPrimakara: number;
  jmlPeserta: number;
  dosen: boolean;
  dosenCari: string;
  dosenNama: string;
  biaya: string;
  dispensasi: boolean;
  hasil: 'sukses' | 'gagal';
};

const dasar: Pengajuan = {
  id: 'TC-MHS-001',
  judul: 'Pengajuan valid (data dasar)',
  nama: 'SITEFEST PRIMAKARA 2026',
  jenis: 'Robotika',
  penyelenggara: 'Primakara University',
  link: 'https://primakara.ac.id/',
  poster: 'tests/files/logo-primakara.jpg',
  bersamaTeman: false,
  hariDaftar: 0,
  hariPelaksanaan: 3,
  hariPengumuman: 7,
  kategori: 'Akademik',
  tingkat: 'Internasional',
  prestise: 'Bergengsi',
  peserta: 'Antar Mahasiswa',
  pelaksanaan: 'Offline',
  lokasi: 'Dalam Bali',
  jmlPrimakara: 5,
  jmlPeserta: 40,
  dosen: true,
  dosenCari: 'Cahya',
  dosenNama: 'PUTRI ANUGRAH CAHYA DEWI',
  biaya: '150000',
  dispensasi: true,
  hasil: 'sukses',
};

export const kasus: Pengajuan[] = [
  dasar,
  { ...dasar, id: 'TC-MHS-002', judul: 'Lomba nasional tanpa dosen', tingkat: 'Nasional', dosen: false },
  { ...dasar, id: 'TC-MHS-003', judul: 'Lomba online', pelaksanaan: 'Online', lokasi: 'Luar Bali' },
  { ...dasar, id: 'TC-MHS-004', judul: 'Tanpa surat dispensasi', dispensasi: false },
  { ...dasar, id: 'TC-MHS-005', judul: 'Nama lomba kosong ditolak', nama: '', hasil: 'gagal' },
];
