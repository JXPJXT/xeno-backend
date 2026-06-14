import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { createTenantExtension } from './prisma-tenant.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly tenantContext: TenantContextService) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to PostgreSQL...');
    await this.$connect();
    this.logger.log('✅ PostgreSQL connected');

    // Log slow queries in development
    if (process.env.APP_ENV === 'development') {
      (this as any).$on('query', (e: any) => {
        if (e.duration > 100) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from PostgreSQL...');
    await this.$disconnect();
    this.logger.log('PostgreSQL disconnected');
  }

  /**
   * Returns a tenant-scoped Prisma client that automatically injects
   * tenant_id into all queries and mutations.
   *
   * If no tenantId is provided, reads from the AsyncLocalStorage context.
   *
   * Usage:
   * ```
   * const db = this.prisma.forTenant();
   * const customers = await db.customer.findMany(); // auto-filtered by tenant
   * ```
   */
  forTenant(tenantId?: string) {
    const resolvedTenantId = tenantId || this.tenantContext.getTenantId();

    if (!resolvedTenantId) {
      throw new Error(
        'Cannot create tenant-scoped client: no tenant ID available. ' +
          'Ensure TenantGuard is applied or pass tenantId explicitly.',
      );
    }

    return this.$extends(createTenantExtension(resolvedTenantId));
  }

  /**
   * Health check for the database connection
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute operations within a transaction
   */
  async executeInTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (prisma) => {
      return fn(prisma as PrismaClient);
    });
  }
}
