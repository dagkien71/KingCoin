"use client";

import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import { cn } from "@/lib/cn";
import { IResponse } from "@/types/response";
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { HiOutlinePhotograph, HiX } from "react-icons/hi";

const MAX_IMAGES = 4;
const MAX_BYTES = 5 * 1024 * 1024;

type UploadPayload = {
  url?: string;
  secure_url?: string;
};

type Props = {
  urls: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

function extractUrl(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const envelope = result as IResponse<UploadPayload> & UploadPayload;
  const payload =
    envelope.data && typeof envelope.data === "object"
      ? envelope.data
      : envelope;
  if (!payload || typeof payload !== "object") return null;
  const url = payload.secure_url ?? payload.url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

export function SquareImagePicker({ urls, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { mutate } = useMutation<IResponse<UploadPayload>>("POST", "/upload");

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length || disabled) return;
    const remaining = MAX_IMAGES - urls.length;
    if (remaining <= 0) {
      toast.warn(`Tối đa ${MAX_IMAGES} ảnh mỗi bài`);
      return;
    }

    setUploading(true);
    const added: string[] = [];

    try {
      for (let i = 0; i < Math.min(files.length, remaining); i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          toast.warn(`${file.name}: chỉ chấp nhận ảnh`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.warn(`${file.name}: tối đa 5MB`);
          continue;
        }
        const formData = new FormData();
        formData.append("file", file);
        const result = await mutate(formData);
        if (isMutationFailure(result)) continue;
        const url = extractUrl(result);
        if (url) added.push(url);
      }
      if (added.length > 0) {
        onChange([...urls, ...added]);
        toast.success(
          added.length === 1 ? "Đã thêm ảnh" : `Đã thêm ${added.length} ảnh`
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="relative h-16 w-16 overflow-hidden rounded-lg border border-kc-border bg-kc-bg/50"
          >
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeAt(i)}
              className="absolute right-0.5 top-0.5 rounded-full bg-kc-bg/90 p-0.5 text-kc-muted hover:text-kc-down"
              aria-label="Xóa ảnh"
            >
              <HiX className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {urls.length < MAX_IMAGES ? (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-kc-border text-[10px] text-kc-muted transition",
              "hover:border-kc-accent/50 hover:text-kc-accent",
              uploading && "opacity-60"
            )}
          >
            <HiOutlinePhotograph className="h-5 w-5" />
            {uploading ? "…" : "Ảnh"}
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        aria-label="Chọn ảnh đính kèm"
        disabled={disabled || uploading}
        onChange={(e) => {
          void pickFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-[10px] text-kc-muted">
        JPEG, PNG, WebP, GIF · tối đa 5MB · {urls.length}/{MAX_IMAGES} ảnh
      </p>
    </div>
  );
}
