export const RS_NAME = 'Rumah Sakit Universitas Brawijaya (RSUB)';
export const RS_SHORT = 'RSUB Malang';
export const RS_ADDRESS = 'Jl. Soekarno - Hatta, Lowokwaru, Kota Malang';

export const POLI_LIST = [
  'Poli Penyakit Dalam',
  'Poli Anak (Pediatri)',
  'Poli Jantung & Pembuluh Darah',
  'Poli Paru & Respirasi',
  'Poli Bedah Umum',
  'Poli Ortopedi & Traumatologi',
  'Poli Obstetri & Ginekologi (Obgyn)',
  'Poli Saraf (Neurologi)',
  'Poli Mata',
  'Poli THT-KL',
  'Poli Kulit & Kelamin (DVE)',
  'Poli Kedokteran Jiwa / Psikiatri',
  'Poli Gigi & Mulut',
  'Poli Umum'
] as const;

export type PoliType = typeof POLI_LIST[number];