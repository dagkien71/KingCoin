import Link from "next/link";

const LINKS = [
  { href: "/account/dashboard", label: "Tổng quát" },
  { href: "/wallet", label: "Ví chi tiết" },
  { href: "/convert", label: "Chuyển đổi" },
  { href: "/trade", label: "Giao dịch" },
  { href: "/trade/history", label: "Lịch sử lệnh" },
  { href: "/quest", label: "Nhiệm vụ" },
] as const;

export function AccountQuickLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-lg border border-kc-border bg-kc-surface px-3 py-1.5 text-sm text-kc-fg transition hover:border-kc-accent/50 hover:text-kc-accent"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
