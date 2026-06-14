import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * TenantContext holds request-scoped data propagated via AsyncLocalStorage.
 * Available to all services without manual parameter passing.
 */
export interface TenantContext {
  tenantId: string;
  tenantSlug?: string;
  userId?: string;
  correlationId?: string;
}

/**
 * TenantContextService provides request-scoped tenant isolation
 * using Node.js AsyncLocalStorage.
 *
 * This eliminates the need to pass tenant_id through every function call.
 * Any service can call `getTenantId()` to get the current tenant.
 *
 * Architecture:
 *   Request → Middleware (sets context) → Guard (validates) → Service (reads)
 *
 * Safety:
 *   - Each request gets its own storage context
 *   - No cross-request pollution
 *   - `requireTenantId()` throws if tenant context is not set
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  /**
   * Run a callback within a tenant context.
   * Used by middleware to wrap the entire request lifecycle.
   */
  run(context: TenantContext, callback: () => void): void {
    this.storage.run(context, callback);
  }

  /**
   * Set or update the tenant ID in the current context.
   * Called by TenantGuard after validation.
   */
  setTenantId(tenantId: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.tenantId = tenantId;
    }
  }

  /**
   * Set the user ID in the current context.
   * Called by AuthGuard after JWT validation.
   */
  setUserId(userId: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.userId = userId;
    }
  }

  /**
   * Set the tenant slug in the current context.
   */
  setTenantSlug(slug: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.tenantSlug = slug;
    }
  }

  /**
   * Get the current tenant ID, or undefined if not set.
   */
  getTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }

  /**
   * Get the current tenant ID, throwing if not set.
   * Use this in services that MUST have a tenant context.
   */
  requireTenantId(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error(
        'Tenant context not available. Ensure TenantGuard is applied to this route.',
      );
    }
    return tenantId;
  }

  /**
   * Get the current user ID, or undefined if not set.
   */
  getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  /**
   * Get the current correlation ID for distributed tracing.
   */
  getCorrelationId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }

  /**
   * Get the full context snapshot.
   */
  getContext(): TenantContext | undefined {
    return this.storage.getStore();
  }
}
