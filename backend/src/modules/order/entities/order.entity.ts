import { Order, OrderStatus, OrderType, User } from '@prisma/client';

export default class OrderEntity implements Order {
  constructor(partial: Partial<OrderEntity>) {
    Object.assign(this, partial);
  }

  readonly id!: string;

  readonly userId!: string;

  readonly user!: User;

  readonly tokenId!: string;

  readonly type!: OrderType;

  readonly price!: number;

  readonly quantity!: number;

  readonly matchedQuantity: number;

  readonly pair!: string;

  readonly status!: OrderStatus;

  readonly createdAt!: Date;

  readonly updatedAt!: Date;
}
