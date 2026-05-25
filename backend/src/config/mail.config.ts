import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.SMTP_HOST?.trim() || '',
  port: Number(process.env.SMTP_PORT ?? '587'),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER?.trim() || '',
  pass: process.env.SMTP_PASS?.trim() || '',
  from:
    process.env.MAIL_FROM?.trim() ||
    'KingCoin <noreply@kingcoin.local>',
  appUrl:
    process.env.APP_PUBLIC_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    'http://localhost:3000',
  /** Khi false: không bắt xác minh email để đăng nhập (dev) */
  verificationRequired:
    process.env.EMAIL_VERIFICATION_REQUIRED !== 'false',
}));
