import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import type { ICreateTokenCrypto } from "@/types/token.type";

interface SuccessPopupProps {
  token: ICreateTokenCrypto;
  tokenId?: string | null;
  /** Yêu cầu đã gửi — chờ admin duyệt */
  pendingApproval?: boolean;
  visible: boolean;
  onClose: () => void;
}

export default function SuccessPopup({
  token,
  tokenId,
  pendingApproval,
  visible,
  onClose,
}: SuccessPopupProps) {
  const router = useRouter();

  if (!visible) return null;

  const goStudio = () => {
    onClose();
    router.push("/issuer/tokens");
  };

  if (pendingApproval) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="mx-4 w-full max-w-md rounded-xl border border-amber-500/25 bg-kc-elevated p-6 text-center shadow-kc"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="mx-auto mb-4 h-20 w-20 rounded-xl border border-kc-border object-cover"
            src={token?.logo || "/assets/images/default.webp"}
          />
          <h2 className="mb-2 text-lg font-semibold text-kc-fg">
            Đã gửi yêu cầu niêm yết
          </h2>
          <p className="mb-1 text-sm text-kc-muted">
            <span className="font-medium text-kc-fg">{token.symbol}</span> đang
            chờ admin duyệt.
          </p>
          <p className="text-xs text-kc-muted">
            Bạn sẽ nhận thông báo khi được duyệt. Countdown chỉ hiện trên Markets
            sau khi admin chọn ngày list.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              type="button"
              className="w-full bg-emerald-600 hover:bg-emerald-500"
              onClick={goStudio}
            >
              Xem trạng thái · Studio
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={onClose}
            >
              Đóng
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const goDetail = () => {
    onClose();
    if (tokenId) {
      router.push(`/token/${tokenId}`);
    } else {
      router.push("/issuer/tokens");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="mx-4 w-full max-w-md rounded-xl border border-emerald-500/20 bg-kc-elevated p-6 text-center shadow-kc"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="mx-auto mb-4 h-20 w-20 rounded-xl border border-kc-border object-cover"
          src={token?.logo || "/assets/images/default.webp"}
        />
        <h2 className="mb-2 text-lg font-semibold text-kc-fg">
          Phát hành thành công
        </h2>
        <p className="mb-1 text-sm text-kc-muted">
          Token <span className="font-medium text-kc-fg">{token.symbol}</span> đã
          được niêm yết trên KingCoin.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button
            type="button"
            className="w-full bg-emerald-600 hover:bg-emerald-500"
            onClick={goDetail}
          >
            Xem trang token
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={goStudio}
          >
            Về Studio · Token của tôi
          </Button>
        </div>
      </div>
    </div>
  );
}
