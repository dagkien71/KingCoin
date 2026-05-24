import useMutation from "@/hooks/useMutation";
import React, { useState } from "react";
import { toast } from "react-toastify";
// import ImgsViewer from "react-images-viewer";

interface UploadFileProps {
  onChange?: (url: string) => void;
}

interface IResponseUpload {
  data: { url: string };
}
const UploadFile = ({ onChange }: UploadFileProps) => {
  const [image, setImage] = useState<string | undefined>(undefined);
  const { mutate } = useMutation("POST", "/upload");

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = (await mutate(formData)) as IResponseUpload | undefined;
    if (!response?.data?.url) return;
    setImage(response?.data?.url);
    onChange?.(response?.data?.url);
    toast.success("Tải hình ảnh lên thành công!");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDeleteImage = () => {
    setImage(undefined);
    onChange?.("");
  };

  return (
    <div className="absolute top-0 opacity-0 border rounded-lg">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="mb-2 block w-full cursor-pointer"
      />

      {image && (
        <div className="relative mt-4">
          <img
            src={image}
            alt="Uploaded Preview"
            className="w-full h-auto cursor-pointer"
            onClick={() => undefined}
          />
          <button
            onClick={handleDeleteImage}
            className="absolute top-2 right-2 bg-white p-1 rounded-full shadow hover:bg-red-500 hover:text-white"
            aria-label="Delete Image"
          >
            ❌
          </button>
        </div>
      )}

      {/* <ImgsViewer
        imgs={image ? [{ src: image }] : []}
        currImg={0}
        isOpen={isViewerOpen}
        onClose={() => setViewerOpen(false)}
      /> */}
    </div>
  );
};

export default UploadFile;
