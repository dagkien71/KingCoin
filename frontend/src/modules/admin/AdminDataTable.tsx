import { cn } from "@/lib/cn";
import { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type Props<T> = {
  title?: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  className?: string;
};

export function AdminDataTable<T>({
  title,
  columns,
  rows,
  rowKey,
  emptyMessage = "Không có dữ liệu",
  className,
}: Props<T>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-violet-500/15 bg-[#0c0a14]/60",
        className
      )}
    >
      {title ? (
        <div className="border-b border-violet-500/10 px-4 py-3">
          <h3 className="text-sm font-medium text-kc-fg">{title}</h3>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#14101f]/95 text-kc-muted backdrop-blur-sm">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn("px-4 py-2.5 text-xs font-medium uppercase tracking-wide", col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-kc-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-t border-white/[0.04] transition-colors hover:bg-violet-500/[0.04]"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-2.5", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
