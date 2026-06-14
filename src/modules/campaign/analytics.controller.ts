import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { CampaignService } from './campaign.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators';

@ApiTags('Analytics')
@ApiBearerAuth()
@ApiSecurity('tenant-id')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get('campaigns/:id')
  @ApiOperation({
    summary: 'Get campaign performance analytics',
    description:
      'Returns total sent, delivered, opened, clicked, converted, rates and revenue generated derived from DeliveryReceipts.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Campaign analytics retrieval success',
  })
  async getCampaignAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.campaignService.getCampaignAnalytics(tenantId, id);
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Get platform overview analytics',
    description:
      'Returns aggregated platform statistics for customers, campaigns, orders, revenue, and delivery/open/click metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Overview analytics retrieval success',
  })
  async getOverviewAnalytics(@TenantId() tenantId: string) {
    return this.campaignService.getOverviewAnalytics(tenantId);
  }
}
