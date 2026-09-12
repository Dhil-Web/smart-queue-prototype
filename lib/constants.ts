export const POLI_LIST = [
  'Poli Umum',
  'Poli Gigi & Mulut',
  'Poli Spesialis Anak (Pediatri)',
  'Poli Spesialis Penyakit Dalam (Internis)',
  'Poli Spesialis Jantung & Pembuluh Darah',
  'Poli Spesialis Mata',
  'Poli Spesialis THT',
  'Poli Spesialis Kulit & Kelamin',
  'Poli Spesialis Saraf (Neurologi)',
  'Poli Spesialis Bedah Umum',
  'Poli Spesialis Kandungan & Kebidanan (Obgyn)'
] as const;

export type PoliType = typeof POLI_LIST[number];