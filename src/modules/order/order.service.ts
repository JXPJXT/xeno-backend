import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContextService } from '../../core/tenant-context/tenant-context.service';
import {
  OrderFilterDto,
  CreateOrderDto,
  CreateOrderItemDto,
} from '../product/dto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private get tenantId() {
    return this.tenantContext.requireTenantId();
  }
  private get db() {
    return this.prisma.forTenant(this.tenantId);
  }

  async findAll(filter: OrderFilterDto) {
    const where: any = {};

    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { orderNumber: { contains: filter.search, mode: 'insensitive' } },
        { externalId: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const skip = (filter.page - 1) * filter.limit;

    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        orderBy: { [filter.sortBy]: filter.sortOrder },
        skip,
        take: filter.limit,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: { select: { items: true } },
        },
      }),
      this.db.order.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(total / filter.limit),
      },
    };
  }

  async findById(id: string) {
    const order = await this.db.order.findFirst({
      where: { id },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        items: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(dto: CreateOrderDto) {
    return this.prisma.forTenant(this.tenantId).$transaction(async (tx) => {
      // 1. Create order
      const order = await tx.order.create({
        data: {
          ...dto,
          status: 'PENDING',
          orderedAt: new Date(),
        } as any,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // 2. Find latest DeliveryReceipt of type OPENED/CLICKED in last 7 days
      const sevenDaysAgo = new Date(
        order.orderedAt.getTime() - 7 * 24 * 60 * 60 * 1000,
      );
      const latestReceipt = await tx.deliveryReceipt.findFirst({
        where: {
          tenantId: this.tenantId,
          eventType: { in: ['OPENED', 'CLICKED'] },
          occurredAt: {
            gte: sevenDaysAgo,
            lte: order.orderedAt,
          },
          communicationLog: {
            customerId: order.customerId,
          },
        },
        include: {
          communicationLog: true,
        },
        orderBy: {
          occurredAt: 'desc',
        },
      });

      // 3. If receipt found and associated log has campaignId, create attribution
      if (
        latestReceipt &&
        latestReceipt.communicationLog &&
        latestReceipt.communicationLog.campaignId
      ) {
        await tx.revenueAttribution.create({
          data: {
            tenantId: this.tenantId,
            campaignId: latestReceipt.communicationLog.campaignId,
            customerId: order.customerId,
            orderId: order.id,
            revenue: order.totalAmount,
            attributionModel: 'LAST_TOUCH',
            attributionWeight: 1.0,
            attributedAt: new Date(),
          },
        });
        this.logger.log(
          `Attributed order ${order.id} (revenue: ${order.totalAmount.toString()}) to campaign ${latestReceipt.communicationLog.campaignId} via receipt ${latestReceipt.id}`,
        );
      }

      return order;
    });
  }

  async findOrderItems(orderId: string) {
    await this.findById(orderId);
    return this.db.orderItem.findMany({ where: { orderId } });
  }

  async createOrderItem(dto: CreateOrderItemDto) {
    await this.findById(dto.orderId);
    return this.db.orderItem.create({ data: dto as any });
  }

  async deleteOrderItem(itemId: string) {
    return this.db.orderItem.delete({ where: { id: itemId } });
  }
}
