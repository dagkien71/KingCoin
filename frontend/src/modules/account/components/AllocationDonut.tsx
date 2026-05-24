import { QUOTE_SYMBOL } from "@/constants/quote";

type Slice = { label: string; pct: number; color: string };

export function AllocationDonut({
  slices,
  size = 120,
}: {
  slices: Slice[];
  size?: number;
}) {
  const valid = slices.filter((s) => s.pct > 0.01);
  if (!valid.length) {
    return (
      <div
        className="mx-auto rounded-full border border-dashed border-kc-border bg-kc-surface/40"
        style={{ width: size, height: size }}
      />
    );
  }

  let cursor = 0;
  const gradient = valid
    .map((s) => {
      const start = cursor;
      cursor += s.pct;
      return `${s.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div
        className="shrink-0 rounded-full shadow-inner ring-2 ring-kc-border/80"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${gradient})`,
        }}
        aria-hidden
      />
      <ul className="flex-1 space-y-2 text-sm">
        {valid.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-kc-fg">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
            <span className="num font-semibold">{s.pct.toFixed(1)}%</span>
          </li>
        ))}
        <li className="pt-1 text-xs text-kc-muted">
          Giá trị quy đổi theo {QUOTE_SYMBOL}
        </li>
      </ul>
    </div>
  );
}
