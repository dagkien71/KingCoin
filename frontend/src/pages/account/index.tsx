import UploadFile from "@/components/upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import useFetchApi from "@/hooks/useFetchApi";
import useMutation from "@/hooks/useMutation";
import { AccountQuickLinks } from "@/modules/account/components/AccountQuickLinks";
import { useAppDispatch } from "@/store/hook";
import { logout, setAuthState } from "@/store/slice/authSlice";
import { deleteSessionToken } from "@/store/slice/sessionTokenSlice";
import { ERoles, IUser } from "@/types/user.type";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type ReactNode } from "react";
import { BiCamera } from "react-icons/bi";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { toast } from "react-toastify";

const rowBtn =
  "text-sm font-medium text-kc-accent hover:text-kc-accent-hover hover:underline";

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="border-b border-kc-border px-5 py-3">
        <h2 className="text-base font-semibold text-kc-fg">{title}</h2>
      </div>
      <div className="divide-y divide-kc-border px-5">{children}</div>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  action,
}: {
  label: string;
  value?: ReactNode;
  action?: { label: string; onClick?: () => void; disabled?: boolean };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
      <span className="text-kc-muted">{label}</span>
      <div className="flex items-center gap-4">
        <span className="max-w-[14rem] truncate text-kc-fg sm:max-w-none">
          {value ?? "—"}
        </span>
        {action ? (
          <button
            type="button"
            className={rowBtn}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function EditModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-kc-border bg-kc-surface p-5 shadow-kc-lg">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
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

const ProfilePage = () => {
  const { data, refetch } = useFetchApi<IUser | null>("/users/me");
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { mutate } = useMutation("POST", "/auth/logout");
  const { mutate: patchMe, loading: saving } = useMutation("PATCH", "/users/me");

  const [editUsername, setEditUsername] = useState(false);
  const [editIntro, setEditIntro] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [introInput, setIntroInput] = useState("");

  const patchAndRefresh = async (field: Record<string, unknown>) => {
    const body = await patchMe(field);
    const res = body as { data?: IUser };
    dispatch(setAuthState({ userInfo: res?.data ?? null, isLogin: true }));
    await refetch();
  };

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
      ]).then(() => {
        toast.success("Đăng xuất thành công!");
        dispatch(deleteSessionToken());
        dispatch(logout());
        router.push("/login");
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    setUsernameInput(data?.username ?? "");
    setIntroInput(data?.introduction ?? "");
  }, [data]);

  const memberSince = data?.createdAt
    ? new Date(data.createdAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-kc-bg text-kc-fg">
      <div className="container mx-auto max-w-3xl p-4 pb-20">
        <h1 className="text-2xl font-semibold tracking-tight">Thông tin tài khoản</h1>
        <p className="mt-1 text-sm text-kc-muted">
          Hồ sơ, xác minh và liên kết nhanh tới ví / giao dịch.
        </p>

        <div className="mt-6">
          <AccountQuickLinks />
        </div>

        {data?.role === ERoles.ADMIN ? (
          <Card className="mt-6 border-kc-accent/40 bg-kc-accent/10 p-5">
            <h2 className="text-base font-semibold text-kc-fg">Khu vực quản trị</h2>
            <p className="mt-1 text-sm text-kc-muted">
              Bạn đang đăng nhập với quyền admin.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/admin/market-control">
                <Button type="button" variant="primary">
                  Điều khiển thị trường
                </Button>
              </Link>
              <Link href="/admin">
                <Button type="button" variant="secondary">
                  Trang quản trị
                </Button>
              </Link>
            </div>
          </Card>
        ) : null}

        <Card className="mt-8 overflow-hidden">
          <div className="border-b border-kc-border px-5 py-3">
            <h2 className="text-base font-semibold">Ảnh đại diện</h2>
          </div>
          <div className="p-5">
            <div className="relative h-fit w-fit">
              <img
                src={data?.avatar || "https://placehold.co/100x100"}
                alt="Ảnh đại diện"
                className="h-24 w-24 rounded-full border border-kc-border object-cover"
              />
              <button
                type="button"
                aria-label="Đổi ảnh đại diện"
                className="absolute bottom-0 right-0 rounded-full border border-kc-border bg-kc-surface p-1.5 text-kc-fg shadow-kc hover:bg-kc-elevated"
              >
                <BiCamera className="h-4 w-4" />
                <UploadFile onChange={handleChangeAvatar} />
              </button>
            </div>
          </div>
        </Card>

        <InfoSection title="Thông tin cá nhân">
          <InfoRow
            label="Username"
            value={data?.username ?? "Chưa đặt"}
            action={{
              label: "Thay đổi",
              onClick: () => setEditUsername(true),
            }}
          />
          <InfoRow
            label="ID người dùng"
            value={
              <span className="font-mono text-xs sm:text-sm">{data?.id}</span>
            }
            action={{
              label: "Sao chép",
              onClick: () => {
                if (!data?.id) return;
                void navigator.clipboard?.writeText(String(data.id));
                toast.success("Đã sao chép ID");
              },
            }}
          />
          <InfoRow
            label="Giới thiệu"
            value={
              data?.introduction?.trim() ? (
                <span className="max-w-xs whitespace-pre-wrap text-left">
                  {data.introduction}
                </span>
              ) : (
                "Chưa có"
              )
            }
            action={{
              label: "Chỉnh sửa",
              onClick: () => setEditIntro(true),
            }}
          />
          {memberSince ? (
            <InfoRow label="Tham gia" value={memberSince} />
          ) : null}
        </InfoSection>

        <InfoSection title="Thông tin xác minh">
          <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span className="text-kc-muted">Xác minh danh tính</span>
            <span
              className={`inline-flex items-center gap-1.5 ${
                data?.isVerified ? "text-kc-up" : "text-kc-muted"
              }`}
            >
              {data?.isVerified ? (
                <>
                  <FaCheckCircle className="h-4 w-4" />
                  Đã xác minh
                </>
              ) : (
                <>
                  <FaTimesCircle className="h-4 w-4" />
                  Chưa xác minh (demo)
                </>
              )}
            </span>
          </div>
          <InfoRow label="Quốc gia/Khu vực" value="Việt Nam" />
        </InfoSection>

        <InfoSection title="Chi tiết tài khoản">
          <InfoRow
            label="Email"
            value={data?.email}
            action={{ label: "Sắp có", disabled: true }}
          />
          <InfoRow
            label="Số điện thoại"
            value={data?.phone ?? "—"}
            action={{ label: "Sắp có", disabled: true }}
          />
          <InfoRow
            label="Bậc phí giao dịch"
            value="Cấp 1 — mô phỏng"
          />
          <InfoRow
            label="Vai trò"
            value={data?.role === ERoles.ADMIN ? "Quản trị viên" : "Người dùng"}
          />
        </InfoSection>

        <InfoSection title="Liên kết">
          <InfoRow
            label="Tổng quát tài sản"
            value={
              <Link href="/account/dashboard" className={rowBtn}>
                Mở tổng quát →
              </Link>
            }
          />
          <InfoRow
            label="Ví & lịch sử"
            value={
              <Link href="/wallet" className={rowBtn}>
                Mở ví →
              </Link>
            }
          />
        </InfoSection>

        <div className="mt-10 flex justify-center">
          <Button variant="danger" type="button" onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>
      </div>

      <EditModal
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
          toast.success("Đã cập nhật username");
          setEditUsername(false);
        }}
      >
        <label className="block text-sm text-kc-muted">
          Username
          <input
            className="mt-1 w-full rounded-lg border border-kc-border bg-kc-bg px-3 py-2 text-sm"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            maxLength={50}
          />
        </label>
      </EditModal>

      <EditModal
        open={editIntro}
        title="Giới thiệu"
        saving={saving}
        onClose={() => setEditIntro(false)}
        onSave={async () => {
          await patchAndRefresh({ introduction: introInput.trim() || null });
          toast.success("Đã lưu giới thiệu");
          setEditIntro(false);
        }}
      >
        <textarea
          className="min-h-[120px] w-full rounded-lg border border-kc-border bg-kc-bg px-3 py-2 text-sm"
          value={introInput}
          onChange={(e) => setIntroInput(e.target.value)}
          maxLength={500}
          placeholder="Mô tả ngắn về bạn (tối đa 500 ký tự)"
        />
      </EditModal>
    </div>
  );
};

export default ProfilePage;
