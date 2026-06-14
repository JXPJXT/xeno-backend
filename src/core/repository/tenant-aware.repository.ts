import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import {
  BaseRepository,
  PaginatedResult,
  PaginationOptions,
} from './base.repository';

/**
 * TenantAwareRepository extends BaseRepository with automatic tenant scoping.
 *
 * ALL domain repositories MUST extend this class.
 * The Prisma tenant extension auto-injects tenant_id into every operation.
 *
 * Services NEVER need to pass tenant_id manually — the repository reads
 * it from AsyncLocalStorage via TenantContextService.
 *
 * Architecture:
 *   Service → TenantAwareRepository → PrismaService.forTenant() → Database
 *
 * @template T - The Prisma model type
 */
export abstract class TenantAwareRepository<T = any> extends BaseRepository<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tenantContext: TenantContextService,
    modelName: string,
  ) {
    super(prisma, modelName);
  }

  /**
   * Get the tenant-scoped Prisma model delegate.
   * Automatically applies tenant_id filtering via Prisma extension.
   */
  protected get model(): any {
    const tenantClient = this.prisma.forTenant();
    return (tenantClient as any)[this.modelName];
  }

  /**
   * Get the raw (unscoped) model for system-level operations.
   * USE WITH EXTREME CAUTION — bypasses tenant isolation.
   */
  protected get unscopedModel(): any {
    return (this.prisma as any)[this.modelName];
  }

  /**
   * Get the current tenant ID from context.
   */
  protected get tenantId(): string {
    return this.tenantContext.requireTenantId();
  }

  /**
   * Find records with soft-delete awareness.
   * Excludes soft-deleted records by default.
   */
  async findManyActive(options?: {
    where?: Record<string, any>;
    include?: Record<string, any>;
    orderBy?: Record<string, any>;
    skip?: number;
    take?: number;
  }): Promise<T[]> {
    const where = {
      ...options?.where,
      deletedAt: null,
    };
    return this.model.findMany({
      ...options,
      where,
    });
  }

  /**
   * Find active records with pagination metadata.
   * Excludes soft-deleted records.
   */
  async findPaginatedActive(
    options: PaginationOptions & {
      where?: Record<string, any>;
      include?: Record<string, any>;
    },
  ): Promise<PaginatedResult<T>> {
    const where = {
      ...options.where,
      deletedAt: null,
    };
    return super.findPaginated({ ...options, where });
  }

  /**
   * Restore a soft-deleted record.
   */
  async restore(id: string): Promise<T> {
    return this.model.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
