import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract the tenant ID from the request.
 * Must be used in controllers protected by TenantGuard.
 *
 * Usage:
 * ```
 * @Get()
 * findAll(@TenantId() tenantId: string) { ... }
 * ```
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
  },
);
