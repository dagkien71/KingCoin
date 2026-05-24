import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-kc-border bg-kc-elevated/80 py-8 text-sm text-kc-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-xs leading-relaxed">
          KingCoin là sàn mô phỏng off-chain. KingCoin (KC) không có giá trị tiền
          tệ thật. Không nạp/rút fiat.
        </p>
        <nav className="flex flex-wrap gap-4 text-xs">
          <Link href="/terms" className="hover:text-kc-accent">
            Điều khoản
          </Link>
          <Link href="/privacy" className="hover:text-kc-accent">
            Bảo mật
          </Link>
          <Link href="/risk" className="hover:text-kc-accent">
            Rủi ro
          </Link>
          <Link href="/faq" className="hover:text-kc-accent">
            FAQ
          </Link>
        </nav>
      </div>
    </footer>
  );
}
