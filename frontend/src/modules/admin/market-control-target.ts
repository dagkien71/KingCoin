import { isStablecoinToken } from "@/types/token.type";

export type ApplyTarget =
  | { mode: "single" }
  | { mode: "group"; tokenIds: string[] }
  | { mode: "all_alts" };

export type TargetMode = "single" | "group" | "all";

export function targetLabel(
  mode: TargetMode,
  groupCount: number,
  allCount: number
): string {
  if (mode === "all") return `Tất cả alt (${allCount} mã)`;
  if (mode === "group") return `Nhóm đã chọn (${groupCount} mã)`;
  return "Một mã (dropdown)";
}

export function applyTargetLabel(
  target: ApplyTarget,
  groupCount: number,
  allCount: number
): string {
  if (target.mode === "all_alts") return targetLabel("all", groupCount, allCount);
  if (target.mode === "group") return targetLabel("group", groupCount, allCount);
  return targetLabel("single", groupCount, allCount);
}

export function filterAlts<T extends { id: string; symbol?: string; tokenKind?: string }>(
  tokens: T[]
): T[] {
  return tokens.filter((t) => !isStablecoinToken(t));
}

export function toApplyTarget(
  mode: TargetMode,
  groupIds: string[]
): ApplyTarget {
  if (mode === "all") return { mode: "all_alts" };
  if (mode === "group") return { mode: "group", tokenIds: groupIds };
  return { mode: "single" };
}

export function bulkTargetBody(target: ApplyTarget): {
  allAlts?: boolean;
  tokenIds?: string[];
} {
  if (target.mode === "all_alts") return { allAlts: true };
  if (target.mode === "group") return { tokenIds: target.tokenIds };
  return {};
}
