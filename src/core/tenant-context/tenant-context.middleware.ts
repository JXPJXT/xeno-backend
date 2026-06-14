import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TenantContextService } from './tenant-context.service';

/**
 * TenantContextMiddleware initializes the AsyncLocalStorage context
 * for every incoming request BEFORE guards execute.
 *
 * Flow:
 *   1. Middleware reads x-tenant-id header (preliminary — not validated yet)
 *   2. Creates AsyncLocalStorage context with tenantId + correlationId
 *   3. TenantGuard validates the tenant and confirms context
 *   4. All downstream services read from TenantContextService
 *
 * This middleware must be registered globally for all routes.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    const correlationId =
      (req.headers['x-correlation-id'] as string) || uuidv4();

    // Initialize AsyncLocalStorage context for this request
    this.tenantContext.run(
      {
        tenantId: tenantId || '',
        correlationId,
      },
      () => {
        // Attach correlation ID to response headers for tracing
        _res.setHeader('x-correlation-id', correlationId);
        next();
      },
    );
  }
}
