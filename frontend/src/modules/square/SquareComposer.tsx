"use client";

import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";
import useMutation from "@/hooks/useMutation";
import { ShareOpenOrderPicker } from "@/modules/square/ShareOpenOrderPicker";
import { SquareImagePicker } from "@/modules/square/SquareImagePicker";
import {
  squareInputClass,
  squareSegmentClass,
  SquareAvatar,
} from "@/modules/square/square-ui";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";
import {
  HiOutlineChartBar,
  HiOutlineDocumentText,
  HiOutlineTrendingUp,
  HiOutlineViewGrid,
} from "react-icons/hi";

type Tab = "text" | "spot" | "futures" | "poll";

type Props = {
  onPosted?: () => void;
  /** Sidebar hẹp — bỏ avatar, tab 2 cột */
  compact?: boolean;
};

const TABS: { id: Tab; label: string; icon: typeof HiOutlineDocumentText }[] = [
  { id: "text", label: "Viết", icon: HiOutlineDocumentText },
  { id: "spot", label: "Spot", icon: HiOutlineChartBar },
  { id: "futures", label: "Futures", icon: HiOutlineTrendingUp },
  { id: "poll", label: "Bình chọn", icon: HiOutlineViewGrid },
];

export function SquareComposer({ onPosted, compact }: Props) {
  const { isLogin, user } = useAuth();
  const [tab, setTab] = useState<Tab>("text");
  const [body, setBody] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [pollOpts, setPollOpts] = useState(["", ""]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const { mutate: createPost, loading } = useMutation("POST", "/square/posts");

  if (!isLogin) {
    return (
      <p className="text-center text-sm text-kc-muted">
        <Link href="/login" className="font-medium text-kc-accent hover:underline">
          Đăng nhập
        </Link>{" "}
        để đăng bài trong Cộng đồng.
      </p>
    );
  }

  const author = {
    id: user?.id ?? "",
    username: user?.username ?? null,
    avatar: user?.avatar ?? null,
  };

  const submit = async () => {
    const payload: Record<string, unknown> = { body: body.trim() };
    if (tab === "text") {
      payload.kind = "text";
    } else if (tab === "spot") {
      if (!selectedId) {
        toast.warn("Chọn lệnh spot để chia sẻ");
        return;
      }
      payload.kind = "order_spot";
      payload.orderId = selectedId;
    } else if (tab === "futures") {
      if (!selectedId) {
        toast.warn("Chọn vị thế futures để chia sẻ");
        return;
      }
      payload.kind = "order_futures";
      payload.positionId = selectedId;
    } else if (tab === "poll") {
      const opts = pollOpts.map((o) => o.trim()).filter(Boolean);
      if (!body.trim()) {
        toast.warn("Nhập câu hỏi poll");
        return;
      }
      if (opts.length < 2) {
        toast.warn("Poll cần ít nhất 2 lựa chọn");
        return;
      }
      payload.kind = "poll";
      payload.pollOptions = opts;
    }

    if (tab !== "poll" && imageUrls.length > 0) {
      payload.imageUrls = imageUrls;
    }

    const res = await createPost(payload);
    if (res != null) {
      toast.success("Đã đăng bài");
      setBody("");
      setSelectedId("");
      setPollOpts(["", ""]);
      setImageUrls([]);
      onPosted?.();
    }
  };

  const tabGrid = compact
    ? "grid grid-cols-2 gap-1 rounded-xl border border-kc-border bg-kc-bg/40 p-1"
    : "flex rounded-xl border border-kc-border bg-kc-bg/40 p-1";

  return (
    <div className="space-y-3">
      <div className={compact ? "space-y-3" : "flex gap-3"}>
        {!compact ? <SquareAvatar author={author} /> : null}
        <div className="min-w-0 flex-1 space-y-3">
          <div className={tabGrid}>
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={squareSegmentClass(tab === t.id, compact)}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    {!compact ? (
                      <Icon className="hidden h-4 w-4 sm:inline" aria-hidden />
                    ) : null}
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          <textarea
            placeholder={
              tab === "poll"
                ? "Đặt câu hỏi cho cộng đồng…"
                : "Bạn đang nghĩ gì về thị trường?"
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={compact ? 2 : 3}
            className={squareInputClass + " resize-none"}
          />

          {tab !== "poll" ? (
            <SquareImagePicker
              urls={imageUrls}
              onChange={setImageUrls}
              disabled={loading}
            />
          ) : null}

          {tab === "spot" ? (
            <ShareOpenOrderPicker
              mode="spot"
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : null}
          {tab === "futures" ? (
            <ShareOpenOrderPicker
              mode="futures"
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : null}

          {tab === "poll" ? (
            <div className="space-y-2 rounded-xl border border-kc-border/80 bg-kc-bg/30 p-3">
              <p className="text-xs font-medium text-kc-muted">Lựa chọn</p>
              {pollOpts.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  value={opt}
                  placeholder={`Phương án ${i + 1}`}
                  className={squareInputClass}
                  onChange={(e) => {
                    const next = [...pollOpts];
                    next[i] = e.target.value;
                    setPollOpts(next);
                  }}
                />
              ))}
              {pollOpts.length < 4 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-kc-accent hover:underline"
                  onClick={() => setPollOpts([...pollOpts, ""])}
                >
                  + Thêm lựa chọn
                </button>
              ) : null}
            </div>
          ) : null}

          <div
            className={
              compact
                ? "pt-1"
                : "flex justify-end border-t border-kc-border/60 pt-3"
            }
          >
            <Button
              type="button"
              disabled={loading}
              className={compact ? "w-full" : undefined}
              onClick={() => void submit()}
            >
              {loading ? "Đang đăng…" : "Đăng bài"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
