export interface IOrder {
  id: string;
  userId: string;
  tokenId: string;
  type: ETypeOrder;
  price: number;
  pair: string;
  quantity: number;
  matchedQuantity: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum ETypeOrder {
  buy = "buy",
  sell = "sell",
}

export enum OrderStatus {
  pending = "pending",
  completed = "completed",
  canceled = "canceled",
}
