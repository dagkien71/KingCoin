const LABELS: Record<string, string> = {
  quest: "Thưởng nhiệm vụ",
  listing_fee: "Phí phát hành token",
  convert: "Chuyển đổi",
  convert_fee: "Phí chuyển đổi",
  trade: "Khớp lệnh",
  trade_fee_maker: "Phí maker (spot)",
  trade_fee_taker: "Phí taker (spot)",
  order_reserve: "Treo lệnh",
  order_cancel: "Hủy lệnh — hoàn",
  order_amend: "Điều chỉnh lệnh",
  futures_margin_lock: "Futures — khóa margin",
  futures_margin_unlock: "Futures — hoàn margin",
  futures_open_fee: "Futures — phí mở lệnh",
  futures_close: "Futures — đóng vị thế",
  futures_close_fee: "Futures — phí đóng lệnh",
  futures_funding: "Futures — funding fee",
  futures_liquidation: "Futures — thanh lý",
  wallet_transfer_out: "Chuyển ví — gửi",
  wallet_transfer_in: "Chuyển ví — nhận",
};

export function ledgerEntryLabel(
  refType: string,
  note?: string | null
): string {
  if (note?.trim()) return note.trim();
  return LABELS[refType] ?? refType;
}
