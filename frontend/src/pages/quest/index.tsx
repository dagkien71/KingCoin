"use client";

import useAuth from "@/hooks/useAuth";
import useFetchApi from "@/hooks/useFetchApi";
import useMutation from "@/hooks/useMutation";
import { QuestCard } from "@/modules/quest/QuestCard";
import { ReferralBanner } from "@/modules/quest/ReferralBanner";
import { QUEST_TABS } from "@/modules/quest/quest-categories";
import type { IQuest, IReferralStats } from "@/types/trade.type";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";

export default function QuestPage() {
  const { isLogin } = useAuth();
  const [tab, setTab] = useState<(typeof QUEST_TABS)[number]["id"]>("all");
  const { data: quests, refetch, loading } = useFetchApi<IQuest[]>("/quests");
  const { data: referral } = useFetchApi<IReferralStats>(
    isLogin ? "/users/me/referral" : ""
  );
  const { mutate: postAction, loading: posting } = useMutation(
    "POST",
    "/quests/placeholder"
  );

  const filtered = useMemo(() => {
    const list = quests ?? [];
    if (tab === "all") return list;
    return list.filter((q) => (q.category ?? q.type) === tab);
  }, [quests, tab]);

  const totalEarned = useMemo(() => {
    return (quests ?? [])
      .filter((q) => q.completed)
      .reduce((s, q) => s + q.rewardKc, 0);
  }, [quests]);

  const pending = (quests ?? []).filter(
    (q) => !q.completed && q.eligible
  ).length;

  const engage = async (questId: string) => {
    await postAction({}, `/quests/${questId}/engage`);
    void refetch();
  };

  const claim = async (questId: string) => {
    try {
      await postAction({}, `/quests/${questId}/claim`);
      toast.success("Đã nhận thưởng KC!");
      void refetch();
    } catch {
      /* useMutation toast */
    }
  };

  return (
    <main className="min-h-screen bg-kc-bg px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6" data-tour="quest-list">
        <div>
          <h1 className="text-2xl font-semibold text-kc-fg">
            Nhiệm vụ — Lan tỏa & kiếm KC
          </h1>
          <p className="mt-2 text-sm text-kc-muted">
            Hoàn thành nhiệm vụ để nhận KingCoin (KC). Ưu tiên{" "}
            <strong className="text-kc-fg">mời bạn</strong> và{" "}
            <strong className="text-kc-fg">chia sẻ</strong> để quảng bá sàn.
          </p>
          {isLogin ? (
            <p className="mt-2 text-sm text-kc-muted">
              Đã nhận từ quest (ước tính):{" "}
              <span className="num font-semibold text-kc-accent">
                {totalEarned} KC
              </span>
              {pending > 0 ? (
                <>
                  {" "}
                  · <span className="text-kc-up">{pending} nhiệm vụ</span> sẵn
                  sàng nhận
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        {!isLogin ? (
          <p className="text-sm text-kc-muted">
            <Link href="/login" className="text-kc-accent hover:underline">
              Đăng nhập
            </Link>{" "}
            để xem và nhận nhiệm vụ.
          </p>
        ) : (
          <>
            <ReferralBanner />

            <div className="flex flex-wrap gap-1 rounded-xl border border-kc-border bg-kc-surface p-1">
              {QUEST_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    tab === t.id
                      ? "bg-kc-accent text-kc-bg"
                      : "text-kc-muted hover:text-kc-fg"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {loading && !quests?.length ? (
                <p className="text-kc-muted">Đang tải…</p>
              ) : null}
              {filtered.map((q) => (
                <QuestCard
                  key={q.id}
                  quest={q}
                  referral={referral}
                  claiming={posting}
                  onEngage={engage}
                  onClaim={claim}
                />
              ))}
              {!loading && !filtered.length ? (
                <p className="text-center text-sm text-kc-muted">
                  Không có nhiệm vụ trong nhóm này.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
