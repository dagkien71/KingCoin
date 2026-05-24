import { cn } from "@/lib/cn";

const SIZE_CLASS = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

export type TokenLogoSize = keyof typeof SIZE_CLASS;

export function tokenLogoFallbackSrc(
  symbol?: string | null,
  name?: string | null,
  id?: string | null
): string {
  const seed = encodeURIComponent((symbol || name || id || "?").trim());
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;
}

type TokenLogoProps = {
  logo?: string | null;
  symbol?: string | null;
  name?: string | null;
  id?: string | null;
  size?: TokenLogoSize;
  className?: string;
  title?: string;
};

/** Logo token — ảnh upload hoặc identicon theo symbol (dễ phân biệt, tránh nhầm mã). */
export function TokenLogo({
  logo,
  symbol,
  name,
  id,
  size = "sm",
  className,
  title,
}: TokenLogoProps) {
  const src = logo?.trim() || tokenLogoFallbackSrc(symbol, name, id);
  const sz = SIZE_CLASS[size];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      title={title ?? symbol ?? name ?? undefined}
      className={cn(
        "shrink-0 rounded-full border border-kc-border object-cover",
        sz,
        className
      )}
    />
  );
}

type TokenIdentityProps = {
  logo?: string | null;
  symbol?: string | null;
  name?: string | null;
  id?: string | null;
  size?: TokenLogoSize;
  subline?: React.ReactNode;
  className?: string;
  nameFirst?: boolean;
};

/** Logo kế bên tên/symbol — dùng danh sách, admin, trade, ví. */
export function TokenIdentity({
  logo,
  symbol,
  name,
  id,
  size = "sm",
  subline,
  className,
  nameFirst = false,
}: TokenIdentityProps) {
  const sym = symbol?.trim() || "—";
  const nm = name?.trim();

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <TokenLogo
        logo={logo}
        symbol={symbol}
        name={name}
        id={id}
        size={size}
      />
      <div className="min-w-0">
        <div className="truncate text-kc-fg">
          {nameFirst && nm ? (
            <>
              <span className="font-medium">{nm}</span>
              <span className="ml-1 font-normal text-kc-muted">({sym})</span>
            </>
          ) : (
            <>
              <span className="font-medium">{sym}</span>
              {nm ? (
                <span className="ml-1 font-normal text-kc-muted">{nm}</span>
              ) : null}
            </>
          )}
        </div>
        {subline ? (
          <div className="truncate text-xs text-kc-muted">{subline}</div>
        ) : null}
      </div>
    </div>
  );
}
