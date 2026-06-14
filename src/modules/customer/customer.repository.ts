import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContextService } from '../../core/tenant-context/tenant-context.service';
import { TenantAwareRepository } from '../../core/repository';

@Injectable()
export class CustomerRepository extends TenantAwareRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, tenantContext, 'customer');
  }

  /**
   * Search customers by name, email, or phone.
   */
  async search(params: {
    search?: string;
    status?: string;
    gender?: string;
    city?: string;
    acquisitionSource?: string;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    const where: any = { deletedAt: null };

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
        { externalId: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.status) where.status = params.status;
    if (params.gender) where.gender = params.gender;
    if (params.city) where.city = params.city;
    if (params.acquisitionSource)
      where.acquisitionSource = params.acquisitionSource;

    const skip = (params.page - 1) * params.limit;

    const [items, total] = await Promise.all([
      this.model.findMany({
        where,
        orderBy: { [params.sortBy]: params.sortOrder },
        skip,
        take: params.limit,
        include: {
          _count: {
            select: { orders: true, identities: true },
          },
        },
      }),
      this.model.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  /**
   * Find customer with all related data for detail view.
   */
  async findByIdWithRelations(id: string) {
    return this.model.findFirst({
      where: { id, deletedAt: null },
      include: {
        identities: true,
        addresses: true,
        devices: true,
        channels: true,
        preferences: true,
        consents: true,
        _count: {
          select: {
            orders: true,
            communicationLogs: true,
            campaignAudiences: true,
          },
        },
      },
    });
  }
}
