import { Injectable } from '@nestjs/common';
import { paginator, PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Order, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class OrderRepository {
  private readonly paginate: PaginatorTypes.PaginateFunction;

  constructor(private prisma: PrismaService) {
    /**
     * @desc Create a paginate function
     * @param model
     * @param options
     * @returns Promise<PaginatorTypes.PaginatedResult<T>>
     */
    this.paginate = paginator({
      page: 1,
      perPage: 64,
    });
  }

  /**
   * @desc Find an order by ID
   * @param id string
   * @returns Promise<Order | null>
   */
  findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { id },
    });
  }

  /**
   * @desc Find many orders based on params
   * @param params Prisma.OrderFindManyArgs
   * @returns Promise<Order[]>
   */
  findMany(params: Prisma.OrderFindManyArgs): Promise<Order[]> {
    return this.prisma.order.findMany(params);
  }

  /**
   * @desc Find a single order based on params
   * @param params Prisma.OrderFindFirstArgs
   * @returns Promise<Order | null>
   */
  async findOne(params: Prisma.OrderFindFirstArgs): Promise<Order | null> {
    return this.prisma.order.findFirst(params);
  }

  /**
   * @desc Create a new order
   * @param data Prisma.OrderCreateInput
   * @returns Promise<Order>
   */
  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    return this.prisma.order.create({
      data: { ...data, matchedQuantity: 0 },
    });
  }

  async createTransaction(data: Prisma.OrderCreateInput): Promise<Order> {
    return this.prisma.order.create({ data });
  }

  /**
   * @desc Find all orders with pagination
   * @param where Prisma.OrderWhereInput
   * @param orderBy Prisma.OrderOrderByWithRelationInput
   * @returns Promise<PaginatorTypes.PaginatedResult<Order>>
   */
  async findAll(
    where: Prisma.OrderWhereInput,
    orderBy: Prisma.OrderOrderByWithRelationInput,
  ): Promise<PaginatorTypes.PaginatedResult<Order>> {
    return this.paginate(this.prisma.order, {
      where,
      orderBy,
    });
  }

  /**
   * @desc Update an order by ID
   * @param id string
   * @param data Prisma.OrderUpdateInput
   * @returns Promise<Order>
   */
  async update(id: string, data: Prisma.OrderUpdateInput): Promise<Order> {
    // Check if the order exists
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new Error(`Order with id ${id} not found`);
    }

    // Update the order
    return this.prisma.order.update({
      where: { id },
      data,
    });
  }

  /**
   * @desc Cancel or delete an order by ID
   * - If pending and unmatched -> delete completely
   * - If pending and partially matched -> cancel the remaining
   * - If fully matched -> cannot cancel
   * @param id string
   * @returns Promise<void>
   */
  async delete(id: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new Error(`Order with id ${id} not found`);
    }

    // Nếu lệnh đã khớp toàn bộ thì không thể hủy
    if (order.quantity === order.matchedQuantity) {
      throw new Error(
        `Order with id ${id} has already been fully matched and cannot be canceled`,
      );
    }

    // Nếu lệnh đang pending và chưa khớp phần nào -> Xóa hoàn toàn
    if (order.status === OrderStatus.pending && order.matchedQuantity === 0) {
      await this.prisma.order.delete({
        where: { id },
      });
      return;
    }

    // Nếu lệnh đang pending và đã khớp một phần -> Hủy phần còn lại
    if (order.status === OrderStatus.pending && order.matchedQuantity > 0) {
      await this.prisma.order.update({
        where: { id },
        data: {
          status: OrderStatus.canceled, // Đánh dấu lệnh đã bị hủy
          quantity: order.matchedQuantity, // Giữ nguyên số lượng đã khớp
        },
      });
      return;
    }

    throw new Error(`Order with id ${id} cannot be canceled`);
  }

  /**
   * @desc Find pending buy orders for a specific coin
   * @param tokenId string
   * @returns Promise<Order[]>
   */
  async findPendingBuyOrders(tokenId: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: {
        tokenId,
        type: 'buy',
        status: 'pending',
      },
      orderBy: {
        price: 'desc',
      },
    });
  }

  /**
   * @desc Find pending sell orders for a specific coin
   * @param tokenId string
   * @returns Promise<Order[]>
   */
  async findPendingSellOrders(tokenId: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: {
        tokenId,
        type: 'sell',
        status: 'pending',
      },
      orderBy: {
        price: 'asc',
      },
    });
  }

  /**
   * @desc Update the status and quantity of an order
   * @param id string
   * @param status string
   * @param quantity number
   * @returns Promise<Order>
   */
  async updateOrderStatusAndQuantity(
    id: string,
    status: OrderStatus,
    quantity: number,
    matchedQuantity: number,
  ): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: {
        status,
        quantity,
        matchedQuantity,
      },
    });
  }
}
