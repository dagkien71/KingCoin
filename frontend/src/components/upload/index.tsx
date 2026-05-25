import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import { IResponse } from "@/types/response";
import React, { useState } from "react";
import { toast } from "react-toastify";

interface UploadFileProps {
  onChange?: (url: string) => void;
}

type UploadPayload = {
  url?: string;
  secure_url?: string;
};

const UploadFile = ({ onChange }: UploadFileProps) => {
  const [image, setImage] = useState<string | undefined>(undefined);
  const { mutate, loading } = useMutation<IResponse<UploadPayload>>(
    "POST",
    "/upload"
  );

  const extractUrl = (result: unknown): string | null => {
    if (!result || typeof result !== "object") return null;
    const envelope = result as IResponse<UploadPayload>;
    const payload = envelope.data;
    if (!payload || typeof payload !== "object") return null;
    return payload.secure_url ?? payload.url ?? null;
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận file ảnh.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh tối đa 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const result = await mutate(formData);
    if (isMutationFailure(result)) return;

    const url = extractUrl(result);
    if (!url) {
      toast.error("Upload thất bại — không nhận được URL ảnh.");
      return;
    }
    setImage(url);
    onChange?.(url);
    toast.success("Tải logo thành công!");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleUpload(file);
    event.target.value = "";
  };

  const handleDeleteImage = () => {
    setImage(undefined);
    onChange?.("");
  };

  return (
    <div className="absolute top-0 opacity-0 border rounded-lg">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={loading}
        className="mb-2 block w-full cursor-pointer disabled:cursor-wait"
      />

      {image && (
        <div className="relative mt-4">
          <img
            src={image}
            alt="Uploaded Preview"
            className="w-full h-auto cursor-pointer"
          />
          <button
            type="button"
            onClick={handleDeleteImage}
            className="absolute top-2 right-2 bg-white p-1 rounded-full shadow hover:bg-red-500 hover:text-white"
            aria-label="Delete Image"
          >
            ❌
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadFile;
