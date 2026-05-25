export type MailTemplateId =
  | 'email_verify'
  | 'signup_welcome'
  | 'password_reset'
  | 'futures_margin_warning'
  | 'futures_liquidated';

export type MailTemplateVars = Record<string, string | number | undefined>;

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"/><title>${title}</title></head>
<body style="font-family:system-ui,sans-serif;background:#0f1115;color:#e8eaed;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#1a1d24;border:1px solid #2a2f3a;border-radius:12px;padding:28px">
    <p style="margin:0 0 8px;font-size:12px;color:#d4a012;letter-spacing:.08em">KINGCOIN</p>
    <h1 style="margin:0 0 16px;font-size:20px;color:#fff">${title}</h1>
    ${bodyHtml}
    <p style="margin:24px 0 0;font-size:12px;color:#8b919a">Email tự động — không trả lời.</p>
  </div>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${href}" style="display:inline-block;background:#d4a012;color:#0f1115;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${label}</a></p>`;
}

export function renderMailTemplate(
  id: MailTemplateId,
  vars: MailTemplateVars,
): { subject: string; html: string; text: string } {
  const appUrl = String(vars.appUrl ?? 'http://localhost:3000');

  switch (id) {
    case 'email_verify': {
      const code = String(vars.code ?? '');
      const subject = `[KingCoin] Mã xác nhận đăng ký: ${code}`;
      const html = layout(
        'Xác nhận email',
        `<p>Xin chào${vars.name ? ` <strong>${vars.name}</strong>` : ''},</p>
         <p>Mã xác nhận tài khoản KingCoin của bạn (có hiệu lực 15 phút):</p>
         <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#d4a012">${code}</p>
         <p>Hoặc mở trang xác nhận:</p>
         ${btn(`${appUrl}/register/verify?email=${encodeURIComponent(String(vars.email ?? ''))}`, 'Nhập mã xác nhận')}
         <p style="font-size:13px;color:#8b919a">Nếu bạn không đăng ký, hãy bỏ qua email này.</p>`,
      );
      return {
        subject,
        html,
        text: `Mã xác nhận KingCoin: ${code}. Hết hạn sau 15 phút.`,
      };
    }
    case 'signup_welcome': {
      const subject = 'Chào mừng đến KingCoin';
      const html = layout(
        'Đăng ký thành công',
        `<p>Tài khoản <strong>${vars.email}</strong> đã được xác nhận.</p>
         <p>Bạn có thể đăng nhập và bắt đầu giao dịch.</p>
         ${btn(`${appUrl}/login`, 'Đăng nhập')}
         ${vars.bonusKc ? `<p>Thưởng đăng ký: <strong>${vars.bonusKc} KC</strong></p>` : ''}`,
      );
      return {
        subject,
        html,
        text: `Đăng ký KingCoin thành công. Đăng nhập tại ${appUrl}/login`,
      };
    }
    case 'password_reset': {
      const code = String(vars.code ?? '');
      const subject = `[KingCoin] Đặt lại mật khẩu`;
      const html = layout(
        'Quên mật khẩu',
        `<p>Mã đặt lại mật khẩu (15 phút):</p>
         <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#d4a012">${code}</p>
         ${btn(`${appUrl}/reset-password?email=${encodeURIComponent(String(vars.email ?? ''))}`, 'Đặt lại mật khẩu')}
         <p style="font-size:13px;color:#8b919a">Nếu bạn không yêu cầu, bỏ qua email này.</p>`,
      );
      return {
        subject,
        html,
        text: `Mã đặt lại mật khẩu KingCoin: ${code}`,
      };
    }
    case 'futures_margin_warning': {
      const subject = `[KingCoin] Cảnh báo margin — ${vars.symbol}`;
      const html = layout(
        'Rủi ro thanh lý',
        `<p>Vị thế <strong>${vars.side}</strong> ${vars.symbol} đang gần ngưỡng thanh lý.</p>
         <ul style="color:#c9cdd3;line-height:1.6">
           <li>Margin ratio: <strong>${vars.marginRatioPct}%</strong></li>
           <li>Giá mark: <strong>${vars.markPrice}</strong> KC</li>
         </ul>
         ${btn(`${appUrl}${vars.deeplink ?? '/futures'}`, 'Mở Futures')}
         <p style="font-size:13px;color:#8b919a">Hãy bổ sung margin hoặc đóng vị thế để giảm rủi ro.</p>`,
      );
      return {
        subject,
        html,
        text: `Cảnh báo margin ${vars.symbol}: ratio ${vars.marginRatioPct}%`,
      };
    }
    case 'futures_liquidated': {
      const subject = `[KingCoin] Vị thế đã bị thanh lý — ${vars.symbol}`;
      const html = layout(
        'Thanh lý lệnh',
        `<p>Vị thế <strong>${vars.side}</strong> ${vars.symbol} đã bị thanh lý tại giá <strong>${vars.markPrice}</strong> KC.</p>
         <p>Số KC hoàn về ví: <strong>${vars.returnKc}</strong></p>
         ${btn(`${appUrl}${vars.deeplink ?? '/futures'}`, 'Xem Futures')}`,
      );
      return {
        subject,
        html,
        text: `Thanh lý ${vars.symbol} ${vars.side} tại ${vars.markPrice} KC`,
      };
    }
    default:
      return { subject: 'KingCoin', html: layout('Thông báo', '<p></p>'), text: '' };
  }
}
