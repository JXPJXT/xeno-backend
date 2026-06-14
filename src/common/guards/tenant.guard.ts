import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContextService } from '../../core/tenant-context/tenant-context.service';

/**
 * TenantGuard extracts the tenant ID from the x-tenant-id header,
 * validates the tenant exists and is active, and confirms the
 * tenant context in AsyncLocalStorage.
 *
 * Every tenant-scoped endpoint must use this guard.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];

    if (!tenantId) {
      throw new UnauthorizedException('Missing required header: x-tenant-id');
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new UnauthorizedException('Invalid tenant ID format');
    }

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, status: true, slug: true },
      });

      if (!tenant) {
        throw new UnauthorizedException('Tenant not found');
      }

      if (tenant.status !== 'ACTIVE') {
        throw new UnauthorizedException(
          `Tenant is ${tenant.status.toLowerCase()}`,
        );
      }

      // Attach tenant to request for downstream use
      request.tenantId = tenant.id;
      request.tenantSlug = tenant.slug;

      // Confirm tenant in AsyncLocalStorage context
      this.tenantContext.setTenantId(tenant.id);
      this.tenantContext.setTenantSlug(tenant.slug);

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Tenant validation failed: ${error}`);
      throw new UnauthorizedException('Tenant validation failed');
    }
  }
}
