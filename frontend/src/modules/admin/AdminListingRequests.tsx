"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useFetchApi from "@/hooks/useFetchApi";
import useMutation from "@/hooks/useMutation";
import { AdminDataTable } from "@/modules/admin/AdminDataTable";
import { TokenLogo } from "@/components/token/TokenLogo";
import type { IListingRequest } from "@/types/listing-request.type";
import {
  LISTING_REQUEST_STATUS_LABEL,
  LISTING_REQUEST_STATUS_TONE,
} from "@/types/listing-request.type";
import { cn } from "@/lib/cn";
import { useMemo, useState } from "react";
import { HiOutlineCheck, HiOutlineX } from "react-icons/hi";
import { toast } from "react-toastify";

function ApproveModal({
  request,
  onClose,
  onDone,
}: {
  request: IListingRequest;
  onClose: () => void;
  onDone: () => void;
}) {
  const minLocal = useMemo(() => {
    const d = new Date(Date.now() + 60_000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  }, []);

  const [listingAt, setListingAt] = useState(minLocal);
  const [featured, setFeatured] = useState(false);
  const { mutate, loading } = useMutation<IListingRequest>(
    "PATCH",
    `/admin/listing-requests/${request.id}/approve`
  );

  const submit = async () => {
    const res = await mutate({
      listingAt: new Date(listingAt).toISOString(),
      isFeatured: featured,
    });
    if (res && typeof res === "object" && "success" in res && res.success) {
      toast.success(`${request.symbol} đã lên lịch niêm yết`);
      onDone();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-violet-500/25 bg-[#0c0a14] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <h3 className="text-sm font-semibold text-kc-fg">
          Duyệt niêm yết · {request.symbol}
        </h3>
        <p className="mt-1 text-xs text-kc-muted">
          Chọn ngày giờ — token mới xuất hiện countdown trên Markets.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-kc-muted">
              Ngày & giờ niêm yết
            </label>
            <Input
              type="datetime-local"
              min={minLocal}
              value={listingAt}
              onChange={(e) => setListingAt(e.target.value)}
              className="border-violet-500/20 bg-black/30"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-kc-muted">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="rounded border-violet-500/40"
            />
            Nổi bật trên Markets (★)
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading || !listingAt}
            className="bg-violet-600 hover:bg-violet-500"
            onClick={() => void submit()}
          >
            {loading ? "Đang duyệt…" : "Duyệt & lên lịch"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminListingRequests() {
  const { data, loading, refetch } = useFetchApi<IListingRequest[]>(
    "/admin/listing-requests"
  );
  const { mutate: rejectMutate, loading: rejecting } = useMutation<IListingRequest>(
    "PATCH",
    "/admin/listing-requests/_"
  );
  const [approveTarget, setApproveTarget] = useState<IListingRequest | null>(
    null
  );

  const rows = data ?? [];

  const handleReject = async (row: IListingRequest) => {
    const reason = window.prompt(
      `Lý do từ chối ${row.symbol} (tuỳ chọn):`,
      ""
    );
    if (reason === null) return;
    const res = await rejectMutate(
      { reason: reason || undefined },
      `/admin/listing-requests/${row.id}/reject`
    );
    if (res && typeof res === "object" && "success" in res && res.success) {
      toast.info(`Đã từ chối ${row.symbol}`);
      void refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/90">
          Niêm yết
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-kc-fg">
          Duyệt yêu cầu list token
        </h1>
        <p className="mt-2 max-w-xl text-sm text-kc-muted">
          User gửi từ Issuer Studio → admin chọn ngày niêm yết → countdown hiện
          trên Markets.
        </p>
      </div>

      <AdminDataTable
        title={`Chờ duyệt (${rows.length})`}
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage={
          loading ? "Đang tải…" : "Không có yêu cầu chờ duyệt."
        }
        columns={[
          {
            key: "token",
            header: "Token",
            render: (r) => (
              <div className="flex items-center gap-2">
                <TokenLogo
                  logo={r.logo}
                  symbol={r.symbol}
                  name={r.name}
                  id={r.id}
                  size="sm"
                />
                <div>
                  <p className="font-medium text-kc-fg">{r.symbol}</p>
                  <p className="text-xs text-kc-muted">{r.name}</p>
                </div>
              </div>
            ),
          },
          {
            key: "supply",
            header: "Cung / giá",
            render: (r) => (
              <div className="text-xs text-kc-muted">
                <p className="num text-kc-fg">{r.totalSupply.toLocaleString()}</p>
                <p>
                  {r.initialPrice != null ? `${r.initialPrice} KC` : "—"}
                </p>
              </div>
            ),
          },
          {
            key: "fee",
            header: "Phí",
            render: (r) => (
              <span className="num text-xs text-kc-muted">
                {r.listingFeeKc} KC
              </span>
            ),
          },
          {
            key: "status",
            header: "Trạng thái",
            render: (r) => (
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                  LISTING_REQUEST_STATUS_TONE[r.status] ??
                    LISTING_REQUEST_STATUS_TONE.pending
                )}
              >
                {LISTING_REQUEST_STATUS_LABEL[r.status] ?? r.status}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (r) =>
              r.status === "pending" ? (
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 gap-1"
                    onClick={() => setApproveTarget(r)}
                  >
                    <HiOutlineCheck className="h-4 w-4 text-kc-up" />
                    Duyệt
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-kc-down"
                    disabled={rejecting}
                    onClick={() => void handleReject(r)}
                  >
                    <HiOutlineX className="h-4 w-4" />
                    Từ chối
                  </Button>
                </div>
              ) : null,
          },
        ]}
      />

      {approveTarget ? (
        <ApproveModal
          request={approveTarget}
          onClose={() => setApproveTarget(null)}
          onDone={() => void refetch()}
        />
      ) : null}
    </div>
  );
}
