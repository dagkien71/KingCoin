import axios from "axios";

/** Lấy message tiếng Việt / backend từ lỗi axios */
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return "Không kết nối được API. Hãy chạy backend (cổng 3001) và kiểm tra NEXT_PUBLIC_API_URL.";
    }
    const data = err.response.data as {
      message?: string | string[];
      error?: { message?: string; details?: unknown };
    };
    if (typeof data?.error?.message === "string" && data.error.message.trim()) {
      return data.error.message.trim();
    }
    if (Array.isArray(data?.message)) {
      return data.message.join(", ");
    }
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    if (err.response.status === 401) {
      return "Phiên đăng nhập hết hạn hoặc chưa đăng nhập.";
    }
    return err.message || "Yêu cầu thất bại.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Yêu cầu thất bại.";
}
