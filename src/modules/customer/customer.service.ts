import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContextService } from '../../core/tenant-context/tenant-context.service';
import { CustomerRepository } from './customer.repository';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFilterDto,
  CreateCustomerAddressDto,
  CreateCustomerChannelDto,
  UpsertCustomerPreferenceDto,
  CreateCustomerConsentDto,
  CreateCustomerDeviceDto,
  AssignTagDto,
} from './dto';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly repo: CustomerRepository,
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private get tenantId() {
    return this.tenantContext.requireTenantId();
  }
  private get db() {
    return this.prisma.forTenant(this.tenantId);
  }

  // ===== CUSTOMER CRUD =====

  async findAll(filter: CustomerFilterDto) {
    return this.repo.search({
      search: filter.search,
      status: filter.status,
      gender: filter.gender,
      city: filter.city,
      acquisitionSource: filter.acquisitionSource,
      page: filter.page,
      limit: filter.limit,
      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
    });
  }

  async findById(id: string) {
    const customer = await this.repo.findByIdWithRelations(id);
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    if (dto.email) {
      const existing = await this.db.customer.findFirst({
        where: { email: dto.email, deletedAt: null },
      });
      if (existing)
        throw new ConflictException('Customer with this email already exists');
    }

    return this.db.customer.create({
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        acquisitionDate: new Date(),
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      } as any,
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findById(id);
    return this.db.customer.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.db.customer.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }

  // ===== ADDRESSES =====

  async getAddresses(customerId: string) {
    await this.findById(customerId);
    return this.db.customerAddress.findMany({ where: { customerId } });
  }

  async createAddress(customerId: string, dto: CreateCustomerAddressDto) {
    await this.findById(customerId);
    return this.db.customerAddress.create({
      data: { customerId, ...dto } as any,
    });
  }

  async deleteAddress(customerId: string, addressId: string) {
    await this.findById(customerId);
    return this.db.customerAddress.delete({ where: { id: addressId } });
  }

  // ===== CHANNELS =====

  async getChannels(customerId: string) {
    await this.findById(customerId);
    return this.db.customerChannel.findMany({ where: { customerId } });
  }

  async createChannel(customerId: string, dto: CreateCustomerChannelDto) {
    await this.findById(customerId);
    return this.db.customerChannel.create({
      data: { customerId, ...dto } as any,
    });
  }

  async deleteChannel(customerId: string, channelId: string) {
    await this.findById(customerId);
    return this.db.customerChannel.delete({ where: { id: channelId } });
  }

  // ===== PREFERENCES =====

  async getPreferences(customerId: string) {
    await this.findById(customerId);
    return this.db.customerPreference.findFirst({ where: { customerId } });
  }

  async upsertPreferences(
    customerId: string,
    dto: UpsertCustomerPreferenceDto,
  ) {
    await this.findById(customerId);
    const existing = await this.db.customerPreference.findFirst({
      where: { customerId },
    });

    if (existing) {
      return this.db.customerPreference.update({
        where: { id: existing.id },
        data: dto as any,
      });
    }

    return this.db.customerPreference.create({
      data: { customerId, ...dto } as any,
    });
  }

  // ===== CONSENTS =====

  async getConsents(customerId: string) {
    await this.findById(customerId);
    return this.db.customerConsent.findMany({ where: { customerId } });
  }

  async createConsent(customerId: string, dto: CreateCustomerConsentDto) {
    await this.findById(customerId);
    const data: any = { customerId, ...dto };
    if (dto.status === 'GRANTED') data.grantedAt = new Date();
    if (dto.status === 'REVOKED') data.revokedAt = new Date();
    return this.db.customerConsent.create({ data });
  }

  // ===== DEVICES =====

  async getDevices(customerId: string) {
    await this.findById(customerId);
    return this.db.customerDevice.findMany({ where: { customerId } });
  }

  async createDevice(customerId: string, dto: CreateCustomerDeviceDto) {
    await this.findById(customerId);
    return this.db.customerDevice.create({
      data: { customerId, ...dto } as any,
    });
  }

  async deleteDevice(customerId: string, deviceId: string) {
    await this.findById(customerId);
    return this.db.customerDevice.delete({ where: { id: deviceId } });
  }

  // ===== TAGS =====

  async getTags(customerId: string) {
    await this.findById(customerId);
    const assignments = await this.db.customerTagAssignment.findMany({
      where: { customerId },
      include: { tag: true },
    });
    return assignments.map((a: any) => a.tag);
  }

  async assignTag(customerId: string, dto: AssignTagDto) {
    await this.findById(customerId);
    const existing = await this.db.customerTagAssignment.findFirst({
      where: { customerId, tagId: dto.tagId },
    });
    if (existing) throw new ConflictException('Tag already assigned');

    return this.db.customerTagAssignment.create({
      data: { customerId, tagId: dto.tagId } as any,
      include: { tag: true },
    });
  }

  async removeTag(customerId: string, tagId: string) {
    await this.findById(customerId);
    const assignment = await this.db.customerTagAssignment.findFirst({
      where: { customerId, tagId },
    });
    if (!assignment) throw new NotFoundException('Tag assignment not found');
    return this.db.customerTagAssignment.delete({
      where: { id: assignment.id },
    });
  }

  async getTimeline(customerId: string) {
    await this.findById(customerId);

    const [
      orders,
      campaignAudiences,
      communicationLogs,
      deliveryReceipts,
      personas,
      segments,
    ] = await Promise.all([
      this.db.order.findMany({
        where: { customerId },
        orderBy: { orderedAt: 'desc' },
      }),
      this.db.campaignAudience.findMany({
        where: { customerId },
        include: { campaign: true, segment: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.communicationLog.findMany({
        where: { customerId },
        include: { campaign: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.deliveryReceipt.findMany({
        where: { communicationLog: { customerId } },
        include: { communicationLog: { include: { campaign: true } } },
        orderBy: { occurredAt: 'desc' },
      }),
      this.db.customerPersona.findMany({
        where: { customerId },
        include: { persona: true },
        orderBy: { assignedAt: 'desc' },
      }),
      this.db.segmentCustomer.findMany({
        where: { customerId },
        include: { segment: true },
        orderBy: { addedAt: 'desc' },
      }),
    ]);

    const events: Array<{
      timestamp: Date;
      type: string;
      title: string;
      metadata: Record<string, any>;
    }> = [];

    // 1. Orders
    orders.forEach((o) => {
      events.push({
        timestamp: o.orderedAt,
        type: 'ORDER_PLACED',
        title: `Placed order #${o.orderNumber || o.id.slice(0, 8)}`,
        metadata: {
          orderId: o.id,
          totalAmount: Number(o.totalAmount),
          status: o.status,
        },
      });
    });

    // 2. Campaign participation
    campaignAudiences.forEach((ca) => {
      events.push({
        timestamp: ca.createdAt,
        type: 'CAMPAIGN_PARTICIPATION',
        title: `Targeted in campaign: ${ca.campaign.name}`,
        metadata: {
          campaignId: ca.campaignId,
          segmentId: ca.segmentId,
          segmentName: ca.segment?.name || 'Unknown',
        },
      });
    });

    // 3. Communication logs (SENT / FAILED)
    communicationLogs.forEach((cl) => {
      if (cl.sentAt) {
        events.push({
          timestamp: cl.sentAt,
          type: 'MESSAGE_SENT',
          title: `Sent ${cl.channel} message`,
          metadata: {
            logId: cl.id,
            channel: cl.channel,
            campaignId: cl.campaignId,
            campaignName: cl.campaign?.name || 'N/A',
          },
        });
      }
      if (cl.failedAt) {
        events.push({
          timestamp: cl.failedAt,
          type: 'MESSAGE_FAILED',
          title: `Failed to deliver ${cl.channel} message`,
          metadata: {
            logId: cl.id,
            errorCode: cl.errorCode,
            errorMessage: cl.errorMessage,
          },
        });
      }
    });

    // 4. Delivery receipts (DELIVERED / OPENED / CLICKED / FAILED)
    deliveryReceipts.forEach((dr) => {
      events.push({
        timestamp: dr.occurredAt,
        type: `MESSAGE_${dr.eventType}`,
        title: `Message ${dr.eventType.toLowerCase()}`,
        metadata: {
          receiptId: dr.id,
          logId: dr.communicationLogId,
          channel: dr.communicationLog.channel,
          campaignId: dr.communicationLog.campaignId,
          campaignName: dr.communicationLog.campaign?.name || 'N/A',
        },
      });
    });

    // 5. Persona assignments
    personas.forEach((p) => {
      events.push({
        timestamp: p.assignedAt,
        type: 'PERSONA_ASSIGNED',
        title: `Assigned persona: ${p.persona.name}`,
        metadata: {
          personaId: p.personaId,
          confidence: Number(p.confidence),
          assignedBy: p.assignedBy,
        },
      });
    });

    // 6. Segment memberships
    segments.forEach((s) => {
      events.push({
        timestamp: s.addedAt,
        type: 'SEGMENT_JOINED',
        title: `Joined segment: ${s.segment.name}`,
        metadata: {
          segmentId: s.segmentId,
        },
      });
    });

    // Sort descending (newest first)
    return events
      .filter((e) => e.timestamp)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
