import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CommunicationService } from './communication.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators';

export class CallbackDto {
  @ApiProperty({ example: 'uuid-of-communication-log' })
  @IsString()
  logId: string;

  @ApiProperty({ example: 'provider-msg-id', required: false })
  @IsOptional()
  @IsString()
  providerMessageId?: string;

  @ApiProperty({ enum: ['DELIVERED', 'OPENED', 'CLICKED', 'FAILED'] })
  @IsEnum(['DELIVERED', 'OPENED', 'CLICKED', 'FAILED'])
  eventType: 'DELIVERED' | 'OPENED' | 'CLICKED' | 'FAILED';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({ example: '2026-06-14T10:00:00.000Z' })
  @IsString()
  occurredAt: string;
}

@ApiTags('Communications')
@Controller('communications')
export class CommunicationController {
  private readonly logger = new Logger(CommunicationController.name);

  constructor(private readonly communicationService: CommunicationService) {}

  /**
   * Webhook endpoint called by the Mock Channel Service.
   * Not JWT-protected — it is an internal webhook receiver.
   */
  @Post('callbacks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive delivery callback from channel service',
    description:
      'Called by the Mock Channel Service when a communication status changes (DELIVERED, OPENED, CLICKED, FAILED).',
  })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  @ApiResponse({ status: 404, description: 'Communication log not found' })
  async receiveCallback(@Body() dto: CallbackDto) {
    this.logger.log(`Received ${dto.eventType} callback for log ${dto.logId}`);
    await this.communicationService.processCallback(dto);
    return { success: true, processed: dto.eventType };
  }

  /**
   * Authenticated endpoint to get all communication logs for a campaign.
   */
  @Get('campaigns/:campaignId')
  @ApiBearerAuth()
  @ApiSecurity('tenant-id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Get all communication logs for a campaign' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Communication logs list' })
  async getLogsForCampaign(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @TenantId() tenantId: string,
  ) {
    return this.communicationService.getLogsForCampaign(tenantId, campaignId);
  }
}
