import type { QuestCategory } from "@/types/trade.type";

export const QUEST_TABS: {
  id: "all" | QuestCategory;
  label: string;
}[] = [
  { id: "all", label: "Tất cả" },
  { id: "onboarding", label: "Bắt đầu" },
  { id: "daily", label: "Hàng ngày" },
  { id: "growth", label: "Lan tỏa" },
  { id: "social", label: "Cộng đồng" },
  { id: "creator", label: "Sáng tạo" },
];

export function categoryLabel(cat?: string): string {
  return QUEST_TABS.find((t) => t.id === cat)?.label ?? cat ?? "";
}
