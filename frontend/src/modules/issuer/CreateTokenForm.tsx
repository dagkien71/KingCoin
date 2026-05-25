"use client";

import { QUOTE_SYMBOL } from "@/constants/quote";
import UploadFile from "@/components/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { apiFieldErrorsToForm } from "@/lib/auth/apply-api-field-errors";
import {
  LISTING_FIELD_KEY_MAP,
  validateFormSubmit,
} from "@/lib/token/create-validation";
import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import { IssuerFormSection } from "@/modules/issuer/IssuerFormSection";
import { TokenMintPreview } from "@/modules/issuer/TokenMintPreview";
import { TOKEN_LISTING_FEE_KC } from "@/modules/issuer/constants";
import SuccessPopup from "@/modules/token/create/popup/success";
import type {
  ICommunityLinks,
  ICreateTokenCrypto,
} from "@/types/token.type";
import type { IListingRequest } from "@/types/listing-request.type";
import { motion } from "framer-motion";
import { ChangeEvent, FormEvent, ReactNode, useState } from "react";
import { FaDiscord, FaTelegram, FaTwitter } from "react-icons/fa";
import { FaTimes } from "react-icons/fa";
import {
  HiOutlineCube,
  HiOutlineGlobeAlt,
  HiOutlinePhotograph,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from "react-icons/hi";

const SOCIAL = [
  { key: "website" as const, label: "Website", icon: HiOutlineGlobeAlt },
  { key: "telegram" as const, label: "Telegram", icon: FaTelegram },
  { key: "discord" as const, label: "Discord", icon: FaDiscord },
  { key: "twitter" as const, label: "X / Twitter", icon: FaTwitter },
];

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-kc-fg/90">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-[11px] text-kc-muted">{hint}</p> : null}
      {error ? <p className="text-[11px] text-kc-down">{error}</p> : null}
    </div>
  );
}

const issuerInputClass =
  "border-white/[0.08] bg-black/20 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/30";

export function CreateTokenForm() {
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const [form, setForm] = useState<ICreateTokenCrypto>({
    name: "",
    logo: "",
    symbol: "",
    decimals: 6,
    totalSupply: 1000,
    initialPrice: 1,
    description: "",
    communityLinks: {
      website: "",
      telegram: "",
      discord: "",
      twitter: "",
    },
  });
  const { mutate, loading } = useMutation<IListingRequest>(
    "POST",
    "/listing-requests"
  );

  const handleFieldChange =
    (field: keyof ICreateTokenCrypto) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      setForm({
        ...form,
        [field]:
          field === "decimals" || field === "totalSupply" || field === "initialPrice"
            ? Number(v)
            : v,
      });
    };

  const handleSocialLinkChange =
    (platform: keyof ICommunityLinks) => (e: ChangeEvent<HTMLInputElement>) => {
      setForm({
        ...form,
        communityLinks: { ...form.communityLinks, [platform]: e.target.value },
      });
    };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validateFormSubmit(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors(null);

    const payload = {
      name: form.name.trim(),
      symbol: form.symbol.trim().toUpperCase(),
      logo: form.logo?.trim() || undefined,
      totalSupply: Number(form.totalSupply),
      initialPrice: Number(form.initialPrice),
      decimals: Number(form.decimals),
      description: (form.description ?? "").trim(),
      communityLinks: form.communityLinks,
    };

    const res = await mutate(payload);
    if (isMutationFailure(res)) {
      const apiErrors = apiFieldErrorsToForm<Record<string, string>>(
        res,
        LISTING_FIELD_KEY_MAP
      );
      if (apiErrors) setErrors(apiErrors as Record<string, string>);
      return;
    }
    if (!res) return;
    const data =
      res && typeof res === "object" && "data" in res
        ? (res as { data?: IListingRequest }).data
        : (res as IListingRequest);
    if (data?.id) setShowPopup(true);
  };

  const err = (key: string) => errors?.[key];

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400/90">
          Mint · Niêm yết
        </p>
        <h1 className="mt-2 bg-gradient-to-r from-kc-fg via-emerald-200 to-amber-200/90 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          Đúc token của bạn
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-kc-muted">
          Thiết kế danh tính, kinh tế token và thương hiệu — xem trước thẻ niêm yết
          bên trái. Phí phát hành{" "}
          <span className="font-medium text-emerald-300">
            {TOKEN_LISTING_FEE_KC} {QUOTE_SYMBOL}
          </span>
          .
        </p>
      </motion.header>

      <form onSubmit={handleFormSubmit}>
        <div className="grid gap-8 xl:grid-cols-[minmax(280px,320px)_1fr] xl:gap-10">
          <div className="xl:sticky xl:top-20 xl:self-start">
            <TokenMintPreview form={form} />
          </div>

          <div className="space-y-5">
            <IssuerFormSection
              step={1}
              title="Danh tính"
              subtitle="Tên hiển thị, mã giao dịch và câu chuyện ngắn của dự án."
              icon={<HiOutlineCube className="h-5 w-5" />}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tên token *" htmlFor="name" error={err("name")}>
                  <Input
                    id="name"
                    placeholder="Ví dụ: Solar Coin"
                    value={form.name}
                    onChange={handleFieldChange("name")}
                    className={cn(issuerInputClass, err("name") && "border-kc-down")}
                  />
                </Field>
                <Field label="Ký hiệu *" htmlFor="symbol" error={errors?.symbol}>
                  <Input
                    id="symbol"
                    placeholder="SLR"
                    value={form.symbol}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        symbol: e.target.value.toUpperCase(),
                      })
                    }
                    className={cn(
                      issuerInputClass,
                      "font-mono uppercase tracking-wider",
                      errors?.symbol && "border-kc-down"
                    )}
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field
                  label="Mô tả *"
                  htmlFor="description"
                  error={errors?.description}
                  hint={`${descriptionLength}/500`}
                >
                  <textarea
                    id="description"
                    rows={4}
                    placeholder="Vision, utility, đối tượng cộng đồng…"
                    value={form.description}
                    maxLength={500}
                    onChange={(e) => {
                      setDescriptionLength(e.target.value.length);
                      setForm({ ...form, description: e.target.value });
                    }}
                    className={cn(
                      "flex min-h-[5.5rem] w-full rounded-lg border px-3.5 py-3 text-sm text-kc-fg placeholder:text-kc-muted",
                      issuerInputClass,
                      "focus-visible:outline-none focus-visible:ring-2",
                      errors?.description && "border-kc-down"
                    )}
                  />
                </Field>
              </div>
            </IssuerFormSection>

            <IssuerFormSection
              step={2}
              title="Kinh tế token"
              subtitle="Quyết định cung, độ chính xác và giá khởi điểm trên sàn."
              icon={<HiOutlineSparkles className="h-5 w-5" />}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Số thập phân"
                  htmlFor="decimals"
                  hint="Thường là 6"
                  error={errors?.decimals ? String(errors.decimals) : undefined}
                >
                  <Input
                    id="decimals"
                    type="number"
                    value={form.decimals}
                    onChange={handleFieldChange("decimals")}
                    className={cn(issuerInputClass, "num")}
                  />
                </Field>
                <Field label="Tổng cung" htmlFor="totalSupply" error={errors?.totalSupply}>
                  <Input
                    id="totalSupply"
                    type="number"
                    value={form.totalSupply}
                    onChange={handleFieldChange("totalSupply")}
                    className={cn(issuerInputClass, "num")}
                  />
                </Field>
                <Field
                  label={`Giá KC *`}
                  htmlFor="initialPrice"
                  error={errors?.initialPrice}
                >
                  <div className="relative">
                    <Input
                      id="initialPrice"
                      type="number"
                      value={form.initialPrice}
                      onChange={handleFieldChange("initialPrice")}
                      className={cn(issuerInputClass, "num pr-12")}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-kc-muted">
                      {QUOTE_SYMBOL}
                    </span>
                  </div>
                </Field>
              </div>
            </IssuerFormSection>

            <IssuerFormSection
              step={3}
              title="Thương hiệu"
              subtitle="Logo là mặt tiền của token — nên vuông, rõ nét."
              icon={<HiOutlinePhotograph className="h-5 w-5" />}
            >
              <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.04] to-transparent p-6 sm:flex-row sm:items-start">
                <div className="relative shrink-0">
                  <div className="absolute -inset-2 rounded-full bg-emerald-500/20 blur-md" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.logo || "/assets/images/default.webp"}
                    alt=""
                    className="relative h-28 w-28 rounded-2xl border-2 border-emerald-500/30 object-cover shadow-lg"
                  />
                </div>
                <div className="flex flex-1 flex-col items-center gap-3 sm:items-start">
                  <p className="text-center text-sm text-kc-muted sm:text-left">
                    PNG, JPG hoặc WebP — khuyến nghị 256×256 trở lên.
                  </p>
                  {err("logo") ? (
                    <p className="text-[11px] text-kc-down">{err("logo")}</p>
                  ) : null}
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">
                      <HiOutlinePhotograph className="h-4 w-4" />
                      Tải logo
                      <UploadFile
                        onChange={(url) => url && setForm({ ...form, logo: url })}
                      />
                    </label>
                    {form.logo ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setForm({ ...form, logo: "" })}
                        className="text-kc-down"
                      >
                        <FaTimes className="h-4 w-4" />
                        Gỡ
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </IssuerFormSection>

            <IssuerFormSection
              step={4}
              title="Cộng đồng"
              subtitle="Tuỳ chọn — link hiện trên trang token sau khi niêm yết."
              icon={<HiOutlineUserGroup className="h-5 w-5" />}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {SOCIAL.map(({ key, label, icon: Icon }) => (
                  <div
                    key={key}
                    className={cn(
                      "rounded-xl border p-3 transition-colors",
                      form.communityLinks?.[key]?.trim()
                        ? "border-emerald-500/30 bg-emerald-500/[0.05]"
                        : "border-white/[0.06] bg-black/10"
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-kc-fg">
                      <Icon className="h-4 w-4 text-emerald-400/80" />
                      {label}
                    </div>
                    <Input
                      id={key}
                      type="url"
                      placeholder="https://"
                      value={form.communityLinks?.[key] ?? ""}
                      onChange={handleSocialLinkChange(key)}
                      className={cn(issuerInputClass, "h-9 text-xs")}
                    />
                    {err(key) ? (
                      <p className="mt-1 text-[11px] text-kc-down">{err(key)}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </IssuerFormSection>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-600/20 via-emerald-900/20 to-amber-900/10 p-6"
            >
              <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-80" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-kc-fg">Gửi yêu cầu niêm yết?</p>
                  <p className="mt-1 text-xs text-kc-muted">
                    Admin sẽ duyệt và chọn ngày list — countdown chỉ hiện sau khi
                    được duyệt.
                  </p>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="shrink-0 bg-gradient-to-r from-emerald-500 to-teal-600 px-8 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-500"
                >
                  {loading ? "Đang gửi…" : "Gửi yêu cầu"}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </form>

      <SuccessPopup
        token={form}
        pendingApproval
        visible={showPopup}
        onClose={() => setShowPopup(false)}
      />
    </>
  );
}
