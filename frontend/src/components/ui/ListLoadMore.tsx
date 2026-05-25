import { Button } from "@/components/ui/button";

type Props = {
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
  remaining?: number;
  className?: string;
};

/** Nút tải thêm cho danh sách phân trang / infinite-style. */
export function ListLoadMore({
  hasMore,
  loading,
  onLoadMore,
  remaining,
  className,
}: Props) {
  if (!hasMore) return null;
  return (
    <div className={className ?? "flex justify-center py-4"}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={loading}
        onClick={onLoadMore}
      >
        {loading
          ? "Đang tải…"
          : remaining != null && remaining > 0
            ? `Tải thêm (${remaining} còn lại)`
            : "Tải thêm"}
      </Button>
    </div>
  );
}
