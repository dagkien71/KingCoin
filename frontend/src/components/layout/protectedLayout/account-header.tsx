import Link from "next/link";
import { useRouter } from "next/router";

const ACCOUNT_ROUTE = [
  { href: "/account/dashboard", name: "Tổng quát" },
  { href: "/account/history", name: "Lịch sử" },
  { href: "/account", name: "Thông tin" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const AccountHeader = () => {
  const router = useRouter();
  const pathname = router.pathname;

  return (
    <nav className="fixed left-0 right-0 top-16 z-40 border-b border-kc-border bg-kc-bg/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 sm:px-6">
        {ACCOUNT_ROUTE.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
              isActive(pathname, route.href)
                ? "text-kc-accent after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-kc-accent"
                : "text-kc-muted hover:text-kc-fg"
            }`}
          >
            {route.name}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default AccountHeader;
