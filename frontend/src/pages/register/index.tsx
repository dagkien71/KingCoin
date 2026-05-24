import { useEffect, useState } from "react";
import Link from "next/link";
import { validateForm } from "@/lib/auth/register-validation";
import { IRegisterForm } from "@/lib/auth/register-type";
import useMutation from "@/hooks/useMutation";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Signup() {
  const [formData, setFormData] = useState<IRegisterForm>({
    email: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const router = useRouter();
  const [errors, setErrors] = useState<IRegisterForm>({});
  const [referralCode, setReferralCode] = useState("");
  const { mutate } = useMutation("POST", "/auth/register");

  useEffect(() => {
    const ref = router.query.ref;
    if (typeof ref === "string" && ref.trim()) {
      setReferralCode(ref.trim().toUpperCase());
    }
  }, [router.query.ref]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validateForm(formData);
    setErrors(validationErrors || {});

    if (Object.keys(validationErrors || {}).length !== 0) {
      return;
    }

    const result = await mutate({
      email: formData.email,
      phone: formData.phone || undefined,
      username: formData.username || undefined,
      password: formData.password as string,
      referralCode: referralCode.trim() || undefined,
    });

    if (result) {
      toast.success("Đăng ký thành công!");
      router.push("/login");
    }
  };

  const field = (id: keyof IRegisterForm, label: string, type: string, ph: string) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-kc-muted">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={(formData[id] as string) || ""}
        onChange={handleChange}
        placeholder={ph}
        autoComplete={
          id === "password"
            ? "new-password"
            : id === "email"
              ? "email"
              : "off"
        }
      />
      {errors[id] && (
        <p className="mt-1 text-xs text-kc-down">{errors[id] as string}</p>
      )}
    </div>
  );

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(212,160,18,0.08),transparent)]" />
      <Card className="relative z-10 w-full max-w-md border-kc-border bg-kc-elevated/95 shadow-kc backdrop-blur-sm">
        <CardHeader className="border-kc-border pb-2">
          <CardTitle className="text-xl">Đăng ký</CardTitle>
          <p className="text-sm text-kc-muted">Tạo tài khoản KingCoin</p>
          {referralCode ? (
            <p className="mt-2 rounded-lg border border-kc-accent/40 bg-kc-accent/10 px-3 py-2 text-sm text-kc-fg">
              Đăng ký qua lời mời — mã{" "}
              <strong className="text-kc-accent">{referralCode}</strong>. Sau khi
              đăng nhập, nhận thưởng{" "}
              <strong>200 KC</strong> tại mục Nhiệm vụ (referee-welcome).
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {field("email", "Email", "email", "you@example.com")}
            {field("phone", "Số điện thoại (tuỳ chọn)", "tel", "+84…")}
            {field("username", "Tên hiển thị (tuỳ chọn)", "text", "trader_pro")}
            {field("password", "Mật khẩu", "password", "Tối thiểu 6 ký tự")}
            {field(
              "confirmPassword",
              "Xác nhận mật khẩu",
              "password",
              "Nhập lại mật khẩu"
            )}
            <div>
              <label
                htmlFor="referralCode"
                className="mb-1.5 block text-sm text-kc-muted"
              >
                Mã giới thiệu (tuỳ chọn)
              </label>
              <Input
                id="referralCode"
                type="text"
                value={referralCode}
                onChange={(e) =>
                  setReferralCode(e.target.value.toUpperCase())
                }
                placeholder="KC…"
              />
            </div>
            <Button type="submit" variant="primary" className="w-full" size="lg">
              Đăng ký
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-kc-muted">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="font-medium text-kc-accent hover:underline"
            >
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
