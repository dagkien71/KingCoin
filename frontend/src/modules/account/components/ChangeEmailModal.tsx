"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type Props = {
  open: boolean;
  currentEmail: string;
  pendingEmail?: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function ChangeEmailModal({
  open,
  currentEmail,
  pendingEmail,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<"form" | "code">("form");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(pendingEmail ? "code" : "form");
    setNewEmail(pendingEmail ?? "");
    setPassword("");
    setCode("");
  }, [open, pendingEmail]);

  const request = useMutation("POST", "/auth/email-change/request");
  const confirm = useMutation("POST", "/auth/email-change/confirm");
  const resend = useMutation("POST", "/auth/email-change/resend");
  const cancel = useMutation("POST", "/auth/email-change/cancel");

  if (!open) return null;

  const targetEmail = (pendingEmail ?? newEmail).trim();

  const resetAndClose = () => {
    setStep(pendingEmail ? "code" : "form");
    setPassword("");
    setCode("");
    if (!pendingEmail) setNewEmail("");
    onClose();
  };

  const submitRequest = async () => {
    if (!newEmail.trim()) {
      toast.error("Nhập email mới.");
      return;
    }
    if (!password) {
      toast.error("Nhập mật khẩu hiện tại.");
      return;
    }
    const result = await request.mutate({
      newEmail: newEmail.trim(),
      currentPassword: password,
    });
    if (isMutationFailure(result)) return;
    toast.success("Đã gửi mã 6 số tới email mới — kiểm tra cả spam.");
    setStep("code");
    setPassword("");
    onSuccess();
  };

  const submitConfirm = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error("Mã gồm 6 chữ số.");
      return;
    }
    const result = await confirm.mutate({ code: code.trim() });
    if (isMutationFailure(result)) return;
    toast.success("Đã đổi email thành công.");
    setCode("");
    setNewEmail("");
    setStep("form");
    onSuccess();
    onClose();
  };

  const onResend = async () => {
    const result = await resend.mutate({});
    if (!isMutationFailure(result)) {
      toast.success("Đã gửi lại mã tới email mới.");
    }
  };

  const onCancel = async () => {
    const result = await cancel.mutate({});
    if (!isMutationFailure(result)) {
      toast.info("Đã hủy yêu cầu đổi email.");
      setStep("form");
      setNewEmail("");
      setCode("");
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-kc-border bg-kc-elevated shadow-kc-lg">
        <div className="border-b border-kc-border px-5 py-4">
          <h3 className="text-lg font-semibold text-kc-fg">Đổi email</h3>
          <p className="mt-1 text-xs text-kc-muted">
            Email hiện tại: <span className="text-kc-fg">{currentEmail}</span>
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          {step === "form" ? (
            <>
              <div>
                <label
                  htmlFor="new-email"
                  className="mb-1.5 block text-sm text-kc-muted"
                >
                  Email mới
                </label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email.moi@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-1.5 block text-sm text-kc-muted"
                >
                  Mật khẩu hiện tại
                </label>
                <Input
                  id="current-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Xác nhận danh tính"
                  autoComplete="current-password"
                />
              </div>
              <p className="text-xs leading-relaxed text-kc-muted">
                Mã xác nhận sẽ gửi tới <strong>email mới</strong>. Bạn cần nhập
                mã trong bước tiếp theo để hoàn tất.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-kc-fg">
                Nhập mã 6 số đã gửi tới{" "}
                <strong className="text-kc-accent">{targetEmail}</strong>
              </p>
              <div>
                <label
                  htmlFor="email-change-code"
                  className="mb-1.5 block text-sm text-kc-muted"
                >
                  Mã xác nhận
                </label>
                <Input
                  id="email-change-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={resend.loading}
                  onClick={() => void onResend()}
                >
                  Gửi lại mã
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={cancel.loading}
                  onClick={() => void onCancel()}
                >
                  Hủy đổi email
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-kc-border px-5 py-4">
          <Button variant="ghost" size="sm" type="button" onClick={resetAndClose}>
            Đóng
          </Button>
          {step === "form" ? (
            <Button
              variant="primary"
              size="sm"
              type="button"
              disabled={request.loading}
              onClick={() => void submitRequest()}
            >
              {request.loading ? "Đang gửi…" : "Gửi mã"}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              type="button"
              disabled={confirm.loading}
              onClick={() => void submitConfirm()}
            >
              {confirm.loading ? "Đang xác nhận…" : "Xác nhận"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
