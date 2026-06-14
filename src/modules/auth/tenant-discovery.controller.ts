import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * Public controller to discover available tenants.
 * No auth or tenant header required — this is called before login.
 */
@ApiTags('Auth')
@Controller('auth/tenants')
export class TenantDiscoveryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'List available tenants (public)',
    description:
      'Returns active tenants for the login screen. No authentication required.',
  })
  @ApiResponse({ status: 200, description: 'List of active tenants' })
  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return tenants;
  }
}
