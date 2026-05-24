"use client";

import useFetchApi from "@/hooks/useFetchApi";
import { futuresPairLabel } from "@/lib/futures-markets";
import { futuresHref } from "@/lib/token-routes";
import type { ITokenCrypto } from "@/types/token.type";
import { useRouter } from "next/router";

type Props = {
  currentTokenId?: string;
  className?: string;
};

export function FuturesPairSelect({ currentTokenId, className }: Props) {
  const router = useRouter();
  const { data: markets } = useFetchApi<ITokenCrypto[]>("/futures/markets");

  if (!markets?.length) return null;

  return (
    <select
      className={
        className ??
        "max-w-[200px] rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm text-kc-fg"
      }
      value={currentTokenId ?? ""}
      onChange={(e) => {
        const t = markets.find((m) => m.id === e.target.value);
        if (!t) return;
        void router.push(futuresHref(t));
      }}
    >
      {markets.map((t) => (
        <option key={t.id} value={t.id}>
          {futuresPairLabel(t)}
        </option>
      ))}
    </select>
  );
}
