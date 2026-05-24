import type { IStablecoinSpec } from "@/types/stablecoin.type";
import { QUOTE_STABLECOIN } from "@/constants/quote";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROWS: { key: keyof IStablecoinSpec; label: string }[] = [
  { key: "pegType", label: "Loại neo" },
  { key: "pegCurrency", label: "Đơn vị neo" },
  { key: "pegTarget", label: "Mục tiêu peg" },
  { key: "pegTolerancePct", label: "Dung sai peg (±%)" },
  { key: "maxDeviation24hPct", label: "Lệch tối đa 24h (%)" },
  { key: "collateralModel", label: "Mô hình dự trữ" },
  { key: "collateralRatioMin", label: "Tỷ lệ dự trữ tối thiểu" },
  { key: "rebalancePolicy", label: "Tái cân bằng" },
  { key: "redemptionPolicy", label: "Quy đổi" },
  { key: "auditStatus", label: "Kiểm toán" },
];

type Props = {
  spec: IStablecoinSpec;
  symbol?: string;
};

export default function StablecoinSpecPanel({ spec, symbol }: Props) {
  const sym = symbol ?? QUOTE_STABLECOIN.symbol;

  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Đặc tả stablecoin</CardTitle>
          <Badge tone="up" className="bg-emerald-600/20 text-emerald-300">
            {sym}
          </Badge>
        </div>
        <p className="text-xs text-kc-muted">
          Đơn vị quote sàn — biến động thấp, neo{" "}
          {spec.pegTarget ?? QUOTE_STABLECOIN.pegTarget}{" "}
          {spec.pegCurrency ?? QUOTE_STABLECOIN.pegCurrency}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid gap-2 sm:grid-cols-2">
          {ROWS.map(({ key, label }) => {
            const v = spec[key];
            if (v == null || v === "") return null;
            return (
              <div key={key} className="rounded-lg border border-kc-border/60 bg-kc-bg/50 px-3 py-2">
                <dt className="text-xs text-kc-muted">{label}</dt>
                <dd className="num mt-0.5 font-medium text-kc-fg">
                  {typeof v === "number" ? v : String(v)}
                </dd>
              </div>
            );
          })}
        </dl>

        {spec.useCases && spec.useCases.length > 0 && (
          <div>
            <p className="text-xs font-medium text-kc-muted">Vai trò trên sàn</p>
            <ul className="mt-1 list-inside list-disc text-kc-fg">
              {spec.useCases.map((u) => (
                <li key={u} className="text-xs">
                  {u.replace(/_/g, " ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {spec.risks && spec.risks.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
            <p className="font-medium">Lưu ý rủi ro</p>
            <ul className="mt-1 list-inside list-disc">
              {spec.risks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {spec.regulatoryNote && (
          <p className="text-xs text-kc-muted">{spec.regulatoryNote}</p>
        )}
      </CardContent>
    </Card>
  );
}
