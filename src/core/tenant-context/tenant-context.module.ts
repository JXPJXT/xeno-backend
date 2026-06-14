import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantContextMiddleware } from './tenant-context.middleware';

/**
 * TenantContextModule provides request-scoped tenant isolation.
 *
 * Registered globally so all modules can inject TenantContextService.
 * Applies TenantContextMiddleware to all routes.
 */
@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenantContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
