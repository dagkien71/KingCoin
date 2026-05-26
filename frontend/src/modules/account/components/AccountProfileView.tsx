"use client";

import UploadFile from "@/components/upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useFetchApi from "@/hooks/useFetchApi";
import useMutation from "@/hooks/useMutation";
import { cn } from "@/lib/cn";
import { useAppDispatch } from "@/store/hook";
import { logout, setAuthState } from "@/store/slice/authSlice";
import { deleteSessionToken } from "@/store/slice/sessionTokenSlice";
import { ERoles, IUser } from "@/types/user.type";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type ReactNode } from "react";
import { BiCamera } from "react-icons/bi";
import {
  HiOutlineClipboardCopy,
  HiOutlineLogout,
  HiOutlineShieldCheck,
} from "react-icons/hi";
import { toast } from "react-toastify";
import {
  UserSocialIconLinks,
  UserSocialLinksEditor,
  UserSocialLinksList,
  userSocialSummary,
} from "@/modules/account/components/UserSocialLinksBlock";
import {
  parseUserSocialLinks,
  serializeUserSocialLinks,
  validateUserSocialLinks,
  type UserSocialLinks,
} from "@/lib/user-social-links";
import { EmailVerificationNotice } from "@/modules/account/components/EmailVerificationNotice";

function isEmailVerified(user: IUser | null | undefined): boolean {
  if (!user) return false;
  if (user.emailVerifiedAt) return true;
  return Boolean(user.isVerified);
}

function FieldModal({
  open,
  title,
  onClose,
  onSave,
  children,
  saving,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
  saving?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-kc-border bg-kc-elevated shadow-kc-lg">
        <div className="border-b border-kc-border px-5 py-4">
          <h3 className="text-lg font-semibold text-kc-fg">{title}</h3>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-kc-border px-5 py-4">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "Đang lưu…" : "Lưu"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  hint,
  children,
  action,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-kc-border/80 py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="sm:max-w-[40%]">
        <p className="text-sm font-medium text-kc-fg">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-kc-muted">{hint}</p> : null}
      </div>
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3 sm:justify-end">
        <div className="min-w-0 flex-1 text-sm text-kc-fg sm:text-right">
          {children}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function AccountProfileView() {
  const { data, refetch } = useFetchApi<IUser | null>("/users/me");
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { mutate } = useMutation("POST", "/auth/logout");
  const { mutate: patchMe, loading: saving } = useMutation("PATCH", "/users/me");

  const [editUsername, setEditUsername] = useState(false);
  const [editIntro, setEditIntro] = useState(false);
  const [editSocial, setEditSocial] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [introInput, setIntroInput] = useState("");
  const [socialInput, setSocialInput] = useState<UserSocialLinks>({});
  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({});

  const patchAndRefresh = async (field: Record<string, unknown>) => {
    const body = await patchMe(field);
    const res = body as { data?: IUser };
    dispatch(setAuthState({ userInfo: res?.data ?? null, isLogin: true }));
    await refetch();
  };

  useEffect(() => {
    setUsernameInput(data?.username ?? "");
    setIntroInput(data?.introduction ?? "");
    setSocialInput(parseUserSocialLinks(data?.socialLinks));
  }, [data]);

  const handleChangeAvatar = (avt: string) => {
    if (!avt) return;
    void patchAndRefresh({ avatar: avt }).then(() =>
      toast.success("Đã cập nhật ảnh đại diện")
    );
  };

  const handleLogout = async () => {
    try {
      await Promise.all([
        fetch("/api/auth", { method: "DELETE" }),
        mutate(),
      ]);
      toast.success("Đăng xuất thành công");
      dispatch(deleteSessionToken());
      dispatch(logout());
      router.push("/login");
    } catch {
      /* ignore */
    }
  };

  const displayName =
    data?.username?.trim() || data?.email?.split("@")[0] || "Trader";
  const isAdmin = data?.role === ERoles.ADMIN;
  const emailVerified = isEmailVerified(data);
  const memberSince = data?.createdAt
    ? new Date(data.createdAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Thông tin</h1>
        <p className="mt-1 text-sm text-kc-muted">
          Quản lý hồ sơ hiển thị trên KingCoin.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <Card className="overflow-hidden lg:sticky lg:top-28">
            <div className="h-20 bg-gradient-to-r from-kc-accent/20 via-violet-600/15 to-transparent" />
            <CardContent className="relative -mt-10 space-y-4 pb-5 pt-0">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <img
                    src={data?.avatar || "https://placehold.co/128x128"}
                    alt=""
                    className="h-20 w-20 rounded-2xl border-2 border-kc-elevated object-cover shadow-kc"
                  />
                  <button
                    type="button"
                    aria-label="Đổi ảnh"
                    className="absolute -bottom-1 -right-1 rounded-lg border border-kc-border bg-kc-surface p-1.5 text-kc-fg hover:bg-kc-bg"
                  >
                    <BiCamera className="h-4 w-4" />
                    <UploadFile onChange={handleChangeAvatar} />
                  </button>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-kc-fg">
                  {displayName}
                </h2>
                <p className="mt-0.5 max-w-full truncate text-sm text-kc-muted">
                  {data?.email ?? "—"}
                </p>
                <UserSocialIconLinks
                  socialLinksRaw={data?.socialLinks}
                  size="sm"
                  className="mt-3"
                />
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-medium",
                      emailVerified
                        ? "bg-kc-up/15 text-kc-up"
                        : "bg-kc-surface text-kc-muted"
                    )}
                  >
                    {emailVerified ? "Email đã xác minh" : "Email chưa xác minh"}
                  </span>
                  <span className="rounded-md bg-kc-surface px-2 py-0.5 text-[11px] text-kc-muted">
                    {isAdmin ? "Admin" : "Trader"}
                  </span>
                </div>
              </div>

              <dl className="space-y-2 border-t border-kc-border pt-4 text-xs">
                {memberSince ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-kc-muted">Tham gia</dt>
                    <dd className="num text-kc-fg">{memberSince}</dd>
                  </div>
                ) : null}
              </dl>

              {isAdmin ? (
                <div className="flex flex-col gap-2 border-t border-kc-border pt-4">
                  <Link href="/admin/market-control" className="w-full">
                    <Button variant="primary" size="sm" className="w-full">
                      <HiOutlineShieldCheck className="mr-1.5 h-4 w-4" />
                      Điều khiển thị trường
                    </Button>
                  </Link>
                  <Link href="/admin" className="w-full">
                    <Button variant="secondary" size="sm" className="w-full">
                      Console admin
                    </Button>
                  </Link>
                </div>
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="mt-2 w-full text-kc-muted hover:text-red-300"
                onClick={() => void handleLogout()}
              >
                <HiOutlineLogout className="mr-1.5 h-4 w-4" />
                Đăng xuất
              </Button>
            </CardContent>
          </Card>
        </aside>

        <div className="lg:col-span-8">
          {!emailVerified && data?.email ? (
            <EmailVerificationNotice
              email={data.email}
              onVerified={() => void refetch()}
            />
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Hồ sơ công khai</CardTitle>
              <p className="text-xs text-kc-muted">
                Thông tin người khác có thể thấy trên nền tảng.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <SettingRow
                label="Username"
                hint="Tối thiểu 3 ký tự"
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setEditUsername(true)}
                  >
                    Đổi
                  </Button>
                }
              >
                <span className="font-medium">
                  {data?.username ?? "Chưa đặt"}
                </span>
              </SettingRow>

              <SettingRow
                label="Giới thiệu"
                hint="Tối đa 500 ký tự"
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setEditIntro(true)}
                  >
                    {data?.introduction?.trim() ? "Sửa" : "Thêm"}
                  </Button>
                }
              >
                <p className="whitespace-pre-wrap text-left sm:text-right">
                  {data?.introduction?.trim() || (
                    <span className="text-kc-muted">Chưa có nội dung.</span>
                  )}
                </p>
              </SettingRow>

              <SettingRow
                label="Mạng xã hội"
                hint="Website, X, Telegram, Discord…"
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setSocialInput(parseUserSocialLinks(data?.socialLinks));
                      setSocialErrors({});
                      setEditSocial(true);
                    }}
                  >
                    {userSocialSummary(data?.socialLinks) === "Chưa có"
                      ? "Thêm"
                      : "Sửa"}
                  </Button>
                }
              >
                <UserSocialLinksList socialLinksRaw={data?.socialLinks} />
              </SettingRow>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Tài khoản</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <SettingRow label="Email">{data?.email ?? "—"}</SettingRow>
              <SettingRow
                label="Mã ví chuyển KC"
                hint="Chia sẻ để nhận KC — quản lý tại Chuyển ví"
                action={
                  (data as IUser & { walletCode?: string })?.walletCode ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        const code = (data as IUser & { walletCode?: string })
                          .walletCode;
                        if (code) {
                          void navigator.clipboard?.writeText(code);
                          toast.success("Đã sao chép mã ví");
                        }
                      }}
                    >
                      <HiOutlineClipboardCopy className="h-4 w-4" />
                    </Button>
                  ) : null
                }
              >
                <code className="font-mono text-sm text-kc-accent">
                  {(data as IUser & { walletCode?: string })?.walletCode ?? (
                    <Link href="/account/transfer" className="text-kc-accent underline">
                      Lấy mã tại Chuyển ví
                    </Link>
                  )}
                </code>
              </SettingRow>
              <SettingRow
                label="ID người dùng"
                hint="Dùng khi liên hệ hỗ trợ"
                action={
                  data?.id ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      aria-label="Sao chép ID"
                      onClick={() => {
                        void navigator.clipboard?.writeText(String(data.id));
                        toast.success("Đã sao chép");
                      }}
                    >
                      <HiOutlineClipboardCopy className="h-4 w-4" />
                    </Button>
                  ) : null
                }
              >
                <code className="block truncate font-mono text-xs">
                  {data?.id ?? "—"}
                </code>
              </SettingRow>
            </CardContent>
          </Card>
        </div>
      </div>

      <FieldModal
        open={editUsername}
        title="Đổi username"
        saving={saving}
        onClose={() => setEditUsername(false)}
        onSave={async () => {
          const u = usernameInput.trim();
          if (u.length < 3) {
            toast.error("Username tối thiểu 3 ký tự");
            return;
          }
          await patchAndRefresh({ username: u });
          toast.success("Đã cập nhật");
          setEditUsername(false);
        }}
      >
        <input
          aria-label="Username"
          className="w-full rounded-lg border border-kc-border bg-kc-bg px-3 py-2.5 text-sm text-kc-fg focus:outline-none focus:ring-2 focus:ring-kc-accent/40"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          maxLength={50}
          autoFocus
        />
      </FieldModal>

      <FieldModal
        open={editIntro}
        title="Giới thiệu"
        saving={saving}
        onClose={() => setEditIntro(false)}
        onSave={async () => {
          await patchAndRefresh({ introduction: introInput.trim() || null });
          toast.success("Đã lưu");
          setEditIntro(false);
        }}
      >
        <textarea
          aria-label="Giới thiệu"
          className="min-h-[140px] w-full rounded-lg border border-kc-border bg-kc-bg px-3 py-2.5 text-sm text-kc-fg focus:outline-none focus:ring-2 focus:ring-kc-accent/40"
          value={introInput}
          onChange={(e) => setIntroInput(e.target.value)}
          maxLength={500}
          placeholder="Viết vài dòng về bạn…"
          autoFocus
        />
      </FieldModal>

      <FieldModal
        open={editSocial}
        title="Mạng xã hội & liên kết"
        saving={saving}
        onClose={() => {
          setEditSocial(false);
          setSocialErrors({});
        }}
        onSave={async () => {
          const errs = validateUserSocialLinks(socialInput);
          if (Object.keys(errs).length > 0) {
            setSocialErrors(errs);
            toast.error("Kiểm tra lại URL.");
            return;
          }
          await patchAndRefresh({
            socialLinks: serializeUserSocialLinks(socialInput),
          });
          toast.success("Đã cập nhật liên kết");
          setEditSocial(false);
          setSocialErrors({});
        }}
      >
        <UserSocialLinksEditor
          value={socialInput}
          onChange={setSocialInput}
          errors={socialErrors}
        />
      </FieldModal>
    </>
  );
}
