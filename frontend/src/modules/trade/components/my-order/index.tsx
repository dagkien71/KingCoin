import useAuth from "@/hooks/useAuth";
import useMutation, { isMutationFailure } from "@/hooks/useMutation";
import { ETypeOrder, IOrder, OrderStatus } from "@/types/order.type";
import { withQuoteUnit } from "@/constants/quote";
import { formatNumber, formatTokenPrice } from "@/utils/format-number";
import clsx from "clsx";
import moment from "moment";
import { useMemo, useState } from "react";
import { FaChevronRight, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";

const statusColor = {
  [OrderStatus.pending]: "text-amber-400",
  [OrderStatus.completed]: "text-kc-up",
  [OrderStatus.canceled]: "text-kc-down",
};

type OrderSection = "pending" | "history" | "positions" | "assets" | "bots";

const SECTIONS: {
  id: OrderSection;
  label: string;
  placeholder?: boolean;
}[] = [
  { id: "pending", label: "Chờ khớp" },
  { id: "history", label: "Lịch sử lệnh" },
  { id: "positions", label: "Vị thế mở", placeholder: true },
  { id: "assets", label: "Tài sản", placeholder: true },
  { id: "bots", label: "Bot", placeholder: true },
];

const MyOrder = ({
  orders,
  refetch,
}: {
  orders?: IOrder[];
  refetch?: () => void;
}) => {
  const { mutate } = useMutation("DELETE", "/orders");
  const { user } = useAuth();
  const [section, setSection] = useState<OrderSection>("pending");

  const filteredOrders = useMemo(() => {
    if (!orders?.length) return [];
    if (section === "pending") {
      return orders.filter((o) => o.status === OrderStatus.pending);
    }
    if (section === "history") {
      return orders.filter(
        (o) =>
          o.status === OrderStatus.completed || o.status === OrderStatus.canceled
      );
    }
    return [];
  }, [orders, section]);

  const pendingCount =
    user?.orders?.filter((item) => item?.status === OrderStatus.pending)
      .length ?? 0;

  const handleAdjust = () => {
    toast.info("Điều chỉnh lệnh đang được phát triển.");
  };

  const handleAddTpSl = () => {
    toast.info("Thêm TP/SL sẽ hỗ trợ ở phiên bản sau.");
  };

  const handleCancel = async (idOrder: string) => {
    const ok = await mutate({}, `/orders/${idOrder}`);
    if (!ok || isMutationFailure(ok)) return;
    refetch?.();
    toast.success("Huỷ lệnh thành công!");
  };

  return (
    <div className="p-3 text-xs text-kc-fg sm:p-4">
      <div className="mb-3 flex flex-wrap gap-1 border-b border-kc-border pb-2">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={clsx(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              section === item.id
                ? "bg-kc-accent/15 text-kc-accent"
                : "text-kc-muted hover:bg-white/[0.04] hover:text-kc-fg"
            )}
          >
            {item.label}
            {item.id === "pending" ? ` (${pendingCount})` : ""}
            {item.placeholder ? " · sớm" : ""}
          </button>
        ))}
      </div>

      {SECTIONS.find((s) => s.id === section)?.placeholder ? (
        <p className="py-6 text-center text-sm text-kc-muted">
          Mục này sẽ mở trong bản cập nhật kế tiếp.
        </p>
      ) : filteredOrders.length === 0 ? (
        <p className="py-6 text-center text-kc-muted">
          {section === "pending"
            ? "Không có lệnh chờ khớp."
            : "Chưa có lệnh trong lịch sử."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="whitespace-nowrap border-b border-kc-border">
                <th className="px-3 py-2 text-left">Cặp</th>
                <th className="px-3 py-2 text-left">Thời gian</th>
                <th className="px-3 py-2 text-left">Lệnh</th>
                <th className="px-3 py-2 text-left">KL</th>
                <th className="px-3 py-2 text-left">Giá</th>
                <th className="px-3 py-2 text-left">Tổng</th>
                <th className="px-3 py-2 text-left">Khớp</th>
                <th className="px-3 py-2 text-left">TP/SL</th>
                <th className="px-3 py-2 text-left">Trạng thái</th>
                <th className="px-3 py-2 text-left" colSpan={2}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, index) => {
                const isPending = order?.status === OrderStatus.pending;
                return (
                  <tr
                    key={order?.id ?? index}
                    className="border-b border-kc-border/80"
                  >
                    <td className="px-3 py-2">
                      {order?.pair}{" "}
                      <FaChevronRight className="-mt-1 inline opacity-50" />
                    </td>
                    <td className="px-3 py-2">
                      <div>
                        {moment(order?.createdAt.toString()).format(
                          "DD/MM/YYYY"
                        )}
                      </div>
                      <div className="text-kc-muted">
                        {moment(order?.createdAt.toString()).format("HH:mm:ss")}
                      </div>
                    </td>
                    <td
                      className={clsx(
                        "px-3 py-2 uppercase",
                        order?.type === ETypeOrder.buy
                          ? "text-kc-up"
                          : "text-kc-down"
                      )}
                    >
                      {order?.type}
                    </td>
                    <td className="num px-3 py-2">
                      {formatNumber(order?.quantity)}
                    </td>
                    <td className="num px-3 py-2">
                      {withQuoteUnit(formatTokenPrice(0, order?.price))}
                    </td>
                    <td className="num px-3 py-2">
                      {withQuoteUnit(
                        formatTokenPrice(0, order?.quantity * order?.price)
                      )}
                    </td>
                    <td className="num px-3 py-2">
                      {formatNumber(order?.matchedQuantity)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-kc-accent hover:underline"
                        onClick={handleAddTpSl}
                      >
                        Thêm <FaPlus className="inline h-3 w-3" />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div
                        className={clsx(
                          "capitalize",
                          statusColor[order?.status || OrderStatus.pending]
                        )}
                      >
                        {order?.status}
                      </div>
                      <div className="num text-kc-muted">
                        {formatNumber(order?.quantity)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sky-400">
                      {isPending ? (
                        <button
                          type="button"
                          className="hover:underline"
                          onClick={handleAdjust}
                        >
                          Điều chỉnh
                        </button>
                      ) : (
                        <span className="text-kc-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-kc-down">
                      {isPending ? (
                        <button
                          type="button"
                          className="hover:underline"
                          onClick={() => handleCancel(order?.id)}
                        >
                          Hủy
                        </button>
                      ) : (
                        <span className="text-kc-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyOrder;
