import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
  ApiParam,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { CampaignService } from './campaign.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer Sale Campaign' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Re-engage dormant high-value customers',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP'], example: 'EMAIL' })
  @IsEnum(['EMAIL', 'SMS', 'PUSH', 'WHATSAPP'])
  channel: string;

  @ApiProperty({ example: 'uuid-of-segment', description: 'Target segment ID' })
  @IsString()
  segmentId: string;

  @ApiProperty({
    example: 'Exclusive offer for you, {{firstName}}!',
    required: false,
  })
  @IsOptional()
  @IsString()
  messageSubject?: string;

  @ApiProperty({
    example:
      'Hi {{firstName}}, as a {{primaryPersona}}, we have an exclusive offer on {{topCategory}} just for you!',
  })
  @IsString()
  messageBody: string;
}

@ApiTags('Campaigns')
@ApiBearerAuth()
@ApiSecurity('tenant-id')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  @ApiOperation({
    summary: 'List all campaigns for the tenant',
    description:
      'Returns all campaigns with segment info, message count, and audience count.',
  })
  @ApiResponse({ status: 200, description: 'Campaign list' })
  async findAll(@TenantId() tenantId: string) {
    return this.campaignService.findAll(tenantId);
  }

  @Get('segments')
  @ApiOperation({
    summary: 'List all segments for the tenant',
    description: 'Returns all segments with name, description, type, rules and customer count.',
  })
  @ApiResponse({ status: 200, description: 'Segment list' })
  async findSegments(@TenantId() tenantId: string) {
    return this.campaignService.findSegments(tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a campaign draft',
    description:
      'Creates a new campaign in DRAFT status with a linked segment and message template.',
  })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  async create(@Body() dto: CreateCampaignDto, @TenantId() tenantId: string) {
    return this.campaignService.create(tenantId, dto);
  }

  @Get(':id/preview')
  @ApiOperation({
    summary: 'Preview campaign with personalized messages',
    description:
      'Resolves a sample of customers from the segment and renders personalized message previews using customer attributes, preferences, features, and affinities.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Campaign preview with sample messages',
  })
  async preview(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.campaignService.preview(tenantId, id);
  }

  @Post(':id/launch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Launch a campaign',
    description:
      'Snapshots the audience from the segment, creates communication logs, and enqueues delivery jobs to BullMQ.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Campaign launched with summary' })
  async launch(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.campaignService.launch(tenantId, id);
  }

  @Get(':id/results')
  @ApiOperation({
    summary: 'Get campaign results',
    description:
      'Aggregates communication log statuses (sent, delivered, opened, clicked, failed) for the campaign.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Campaign results with metrics' })
  async results(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.campaignService.results(tenantId, id);
  }
}
