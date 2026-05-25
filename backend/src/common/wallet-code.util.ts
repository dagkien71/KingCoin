import { randomInt } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Mã ví công khai: KC- + 8 ký tự (không dễ nhầm 0/O, 1/I). */
export function generateWalletCode(): string {
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `KC-${suffix}`;
}

export function normalizeWalletCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidWalletCode(code: string): boolean {
  return /^KC-[A-Z2-9]{8}$/.test(normalizeWalletCode(code));
}
