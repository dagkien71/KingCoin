import { useLiveTicker } from "@/context/market-live-context";
import { applyTickerPatch } from "@/lib/apply-ticker-patch";
import useAuth from "@/hooks/useAuth";
import useLiveFetch from "@/hooks/useLiveFetch";
import { Api } from "@/api";
import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import type { IBalanceSnapshot } from "@/types/trade.type";
import type { IResponse } from "@/types/response";
import { QUOTE_SYMBOL } from "@/constants/quote";
import {
  feeFromNotional,
  formatFeePct,
  useTradingFees,
} from "@/hooks/useTradingFees";
import { IOrder, OrderStatus } from "@/types/order.type";
import { ITokenCrypto } from "@/types/token.type";
import { FuturesPanelModal } from "@/modules/futures/FuturesPanelModal";
import clsx from "clsx";
import PriceInputField from "@/components/form/PriceInputField";
import { Button } from "@/components/ui/button";
import {
  formatInputPrice,
  formatTokenPrice,
  roundInputPrice,
} from "@/utils/format-number";
import { ErrorMessage, Field, Form, Formik, type FormikHelpers } from "formik";
import { useRouter } from "next/router";
import { memo, useMemo, useState } from "react";
import {
  HiOutlineAdjustments,
  HiOutlineInformationCircle,
} from "react-icons/hi";
import { toast } from "react-toastify";
import * as Yup from "yup";

interface TradeFormValues {
  type: OrderType;
  price: number;
  quantity: number;
}

type OrderType = "limit" | "market";

const TradeForm = ({
  token,
  refetch,
  onOrderPlaced,
}: {
  token: ITokenCrypto;
  refetch?: () => void;
  onOrderPlaced?: () => void;
}) => {
  const { user, isLogin, updateUserInfo } = useAuth();
  const { data: balances, refetch: refetchBalances } =
    useLiveFetch<IBalanceSnapshot>("/users/me/balances", {
      stream: "trades",
    });
  const router = useRouter();
  const [isBuyActive, setIsBuyActive] = useState(true);
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [sliderValue, setSliderValue] = useState(0);
  const [useMargin, setUseMargin] = useState(false);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [marginModalOpen, setMarginModalOpen] = useState(false);
  const { mutate, loading: orderSubmitting } = useMutation("POST", "/orders");
  const { data: feeRates } = useTradingFees();
  const takerRate = feeRates?.spot.takerRate ?? 0.001;
  const makerRate = feeRates?.spot.makerRate ?? 0.0005;

  const tickerPatch = useLiveTicker(token?.id);
  const liveToken = useMemo(
    () => applyTickerPatch(token, tickerPatch) ?? token,
    [token, tickerPatch]
  );
  const referencePrice = Number(liveToken?.price) || 0;

  const quoteAvailable = useMemo(() => {
    if (balances?.quoteKc != null && balances.quoteKc >= 0) {
      return balances.quoteKc;
    }
    const b = user?.balance;
    return typeof b === "number" ? b : Number(b) || 0;
  }, [balances?.quoteKc, user?.balance]);

  const tokenAvailable = useMemo(() => {
    const row = balances?.tokens?.find((t) => t.tokenId === token.id);
    return row?.amount ?? 0;
  }, [balances?.tokens, token.id]);

  const validationSchema = useMemo(
    () =>
      Yup.object({
        price:
          orderType === "market"
            ? Yup.number().min(0)
            : Yup.number()
                .required("Giá không được để trống")
                .positive("Giá phải là số dương"),
        quantity: Yup.number()
          .required("Số lượng không để trống")
          .positive("Số lượng phải là số dương")
          .test(
            "max-holding",
            `Không đủ ${token.symbol} trong ví`,
            function (value) {
              if (isBuyActive) return true;
              if (value == null) return true;
              return value <= tokenAvailable + 1e-9;
            }
          ),
      }),
    [orderType, isBuyActive, tokenAvailable, token.symbol]
  );

  const formInitialValues = useMemo(
    (): TradeFormValues => ({
      type: "limit",
      price: roundInputPrice(Number(token?.price) || 0),
      quantity: 1,
    }),
    [token.id]
  );

  const handleSliderChange = (
    value: string | number,
    setFieldValue: FormikHelpers<TradeFormValues>["setFieldValue"],
    values: TradeFormValues
  ) => {
    const pct = Number(value) / 100;
    if (isBuyActive) {
      const refPx = Number(values?.price) || referencePrice || 1;
      const maxCost = quoteAvailable / (1 + takerRate);
      const qty = (maxCost * pct) / refPx;
      setFieldValue(
        "quantity",
        Number(qty.toFixed(Math.min(8, token.decimals ?? 4)))
      );
    } else {
      const qty = tokenAvailable * pct;
      setFieldValue(
        "quantity",
        Number(qty.toFixed(Math.min(8, token.decimals ?? 4)))
      );
    }
    setSliderValue(Number(value));
  };

  const resolveMarketPrice = async (): Promise<number> => {
    if (!token?.id) return referencePrice;
    try {
      const side = isBuyActive ? "buy" : "sell";
      const res = await Api.get(
        `/orders/market-price?tokenId=${token.id}&side=${side}`
      );
      const body = res.data as IResponse<{ price: number }> | { price: number };
      const inner =
        body && typeof body === "object" && "data" in body
          ? body.data
          : body;
      return Number((inner as { price?: number })?.price) || referencePrice;
    } catch {
      return referencePrice;
    }
  };

  const handleOrder = async (values: TradeFormValues) => {
    if (orderSubmitting) return;
    const priceOut = roundInputPrice(
      orderType === "market"
        ? await resolveMarketPrice()
        : Number(values.price)
    );
    const res = await mutate({
      price: priceOut,
      quantity: Number(values.quantity),
      tokenId: token?.id,
      type: isBuyActive ? "buy" : "sell",
    });
    if (!res || isMutationFailure(res)) return;

    onOrderPlaced?.();
    void refetchBalances();
    void updateUserInfo();

    const envelope = res as IResponse<IOrder>;
    const order =
      envelope && typeof envelope === "object" && "data" in envelope
        ? (envelope.data as IOrder)
        : (res as unknown as IOrder);
    refetch?.();

    if (order?.status === OrderStatus.pending) {
      toast.success("Đặt lệnh thành công!");
    }
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-end gap-1.5 border-b border-kc-border/60 px-3 py-2">
          <button
            type="button"
            onClick={() => setToolsModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-kc-border bg-kc-bg/80 px-2 py-1.5 text-[10px] font-medium text-kc-muted transition hover:border-kc-accent/30 hover:text-kc-accent"
          >
            <HiOutlineAdjustments className="h-3.5 w-3.5" />
            Công cụ
          </button>
          <button
            type="button"
            onClick={() => setMarginModalOpen(true)}
            className={clsx(
              "inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition",
              useMargin
                ? "border-kc-accent/40 bg-kc-accent/10 text-kc-accent"
                : "border-kc-border bg-kc-bg/80 text-kc-muted hover:text-kc-fg"
            )}
          >
            Ký quỹ
          </button>
        </div>

        <Formik<TradeFormValues>
          key={token.id}
          initialValues={formInitialValues}
          validationSchema={validationSchema}
          onSubmit={(values: TradeFormValues) => handleOrder(values)}
        >
          {({ values, setFieldValue }) => {
            const px =
              orderType === "market"
                ? referencePrice
                : Number(values.price) || 0;
            const qty = Number(values.quantity) || 0;
            const orderTotal = roundInputPrice(px * qty);
            const estFee = isBuyActive
              ? feeFromNotional(orderTotal, takerRate)
              : feeFromNotional(orderTotal, makerRate);
            const feeLabel = isBuyActive ? "taker" : "maker";

            return (
            <>
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5">
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-kc-bg p-0.5 ring-1 ring-kc-border/60">
                  <button
                    type="button"
                    className={clsx(
                      "rounded-md py-2 text-xs font-bold transition",
                      isBuyActive
                        ? "bg-kc-up text-white"
                        : "text-kc-muted hover:text-kc-fg"
                    )}
                    onClick={() => {
                      setIsBuyActive(true);
                      setSliderValue(0);
                    }}
                  >
                    Mua
                  </button>
                  <button
                    type="button"
                    className={clsx(
                      "rounded-md py-2 text-xs font-bold transition",
                      !isBuyActive
                        ? "bg-kc-down text-white"
                        : "text-kc-muted hover:text-kc-fg"
                    )}
                    onClick={() => {
                      setIsBuyActive(false);
                      setSliderValue(0);
                    }}
                  >
                    Bán
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 rounded-lg bg-kc-bg p-0.5 ring-1 ring-kc-border/60">
                  {(["limit", "market"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={clsx(
                        "rounded-md py-1.5 text-[11px] font-semibold transition",
                        orderType === type
                          ? "bg-kc-elevated text-kc-fg ring-1 ring-kc-border/80"
                          : "text-kc-muted hover:text-kc-fg"
                      )}
                      onClick={() => {
                        setOrderType(type);
                        if (type === "market") {
                          setFieldValue(
                            "price",
                            roundInputPrice(referencePrice)
                          );
                        }
                      }}
                    >
                      {type === "limit" ? "Giới hạn" : "Thị trường"}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-kc-muted">
                    Giá ({QUOTE_SYMBOL})
                    {orderType === "market" ? (
                      <span className="ml-1 text-kc-muted/70">· thị trường</span>
                    ) : null}
                  </label>
                  <PriceInputField
                    name="price"
                    disabled={orderType === "market"}
                    className={clsx(
                      "w-full rounded-lg border border-kc-border py-2 px-3 text-sm text-kc-fg",
                      orderType === "market"
                        ? "cursor-not-allowed bg-kc-bg/80 opacity-80"
                        : "bg-kc-elevated"
                    )}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-kc-muted">
                    Số lượng ({token?.symbol})
                  </label>
                  <Field
                    name="quantity"
                    type="number"
                    className="w-full rounded-lg border border-kc-border bg-kc-elevated py-2 px-3 text-sm text-kc-fg"
                  />
                  <ErrorMessage
                    name="quantity"
                    component="div"
                    className="mt-1 text-xs text-kc-down"
                  />
                  <input
                    type="range"
                    className="kc-range mt-2 w-full"
                    min="0"
                    max="100"
                    step="1"
                    value={sliderValue}
                    onChange={(e) =>
                      handleSliderChange(e.target.value, setFieldValue, values)
                    }
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-kc-muted">
                    <button
                      type="button"
                      className="hover:text-kc-fg"
                      onClick={() =>
                        handleSliderChange(0, setFieldValue, values)
                      }
                    >
                      0%
                    </button>
                    <button
                      type="button"
                      className="hover:text-kc-fg"
                      onClick={() =>
                        handleSliderChange(100, setFieldValue, values)
                      }
                    >
                      100%
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-kc-border/60 bg-kc-surface/30 px-2.5 py-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-kc-muted">Tổng ({QUOTE_SYMBOL})</span>
                    <span className="num font-semibold text-kc-fg">
                      {formatInputPrice(orderTotal)}
                    </span>
                  </div>
                  {orderTotal > 0 && estFee > 0 ? (
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-kc-muted">
                        Phí ước tính ({feeLabel}{" "}
                        {formatFeePct(isBuyActive ? takerRate : makerRate)})
                      </span>
                      <span className="num font-medium text-kc-muted">
                        ~{formatTokenPrice(4, estFee)} {QUOTE_SYMBOL}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-kc-muted">Khả dụng</span>
                    <span className="num font-medium text-kc-fg">
                      {isBuyActive
                        ? `${formatTokenPrice(2, quoteAvailable)} ${QUOTE_SYMBOL}`
                        : `${formatTokenPrice(
                            token.decimals ?? 4,
                            tokenAvailable
                          )} ${token?.symbol ?? "—"}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-kc-border bg-kc-surface/40 px-3 py-2.5">
                {isLogin ? (
                  <button
                    type="submit"
                    disabled={orderSubmitting}
                    className={clsx(
                      "w-full rounded-lg py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                      isBuyActive
                        ? "bg-kc-up text-white hover:bg-kc-up/90"
                        : "bg-kc-down text-white hover:bg-kc-down/90"
                    )}
                  >
                    {orderSubmitting
                      ? "Đang đặt lệnh…"
                      : `Đặt lệnh ${isBuyActive ? "Mua" : "Bán"}`}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="w-full rounded-lg border border-kc-border bg-kc-elevated py-2.5 text-sm font-medium text-kc-fg"
                    onClick={() => router.push("/login")}
                  >
                    Đăng nhập để giao dịch
                  </button>
                )}
              </div>
            </Form>

      <FuturesPanelModal
        open={toolsModalOpen}
        onClose={() => setToolsModalOpen(false)}
        title="Công cụ đặt lệnh"
        subtitle="Thao tác nhanh — không gửi lệnh"
      >
        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              setFieldValue("price", roundInputPrice(referencePrice));
              setOrderType("limit");
              toast.success("Đã áp giá tham chiếu.");
              setToolsModalOpen(false);
            }}
          >
            Áp giá niêm yết (
            {referencePrice > 0 ? formatInputPrice(referencePrice) : "—"})
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              setFieldValue("quantity", 1);
              setSliderValue(0);
              toast.info("Đã đặt khối lượng = 1.");
              setToolsModalOpen(false);
            }}
          >
            Đặt khối lượng = 1
          </Button>
        </div>
      </FuturesPanelModal>
            </>
            );
          }}
        </Formik>
      </div>

      <FuturesPanelModal
        open={marginModalOpen}
        onClose={() => setMarginModalOpen(false)}
        title="Ký quỹ (demo)"
        subtitle="Tùy chọn giao diện — chưa bật trên bản mô phỏng"
      >
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-kc-border bg-kc-surface/40 px-3 py-3">
          <span className="text-sm text-kc-fg">Bật ký quỹ</span>
          <input
            type="checkbox"
            checked={useMargin}
            onChange={(e) => {
              setUseMargin(e.target.checked);
              if (e.target.checked) {
                toast.info(
                  "Ký quỹ chưa bật trên bản demo — chỉ lưu tùy chọn giao diện."
                );
              }
            }}
            className="h-4 w-4 rounded border-kc-border accent-kc-accent"
          />
        </label>
        <p className="mt-3 flex gap-2 text-xs text-kc-muted">
          <HiOutlineInformationCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Spot KingCoin hiện giao dịch bằng số dư KC và token trong ví.
        </p>
      </FuturesPanelModal>
    </>
  );
};

export default memo(TradeForm);
