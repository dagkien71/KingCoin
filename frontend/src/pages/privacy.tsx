export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-kc-fg">
      <h1 className="text-2xl font-semibold">Chính sách bảo mật</h1>
      <p className="mt-4 text-sm leading-relaxed text-kc-muted">
        Chúng tôi lưu email, mật khẩu đã băm (bcrypt), dữ liệu giao dịch nội bộ
        và log kỹ thuật để vận hành sàn. Không bán dữ liệu cá nhân. Cookie
        phiên dùng cho đăng nhập.
      </p>
    </main>
  );
}
