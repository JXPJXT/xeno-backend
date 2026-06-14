import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
  ApiResponse,
} from '@nestjs/swagger';
import { DecisioningService } from './decisioning.service';
import { CreateDecisionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators';

@ApiTags('Decisioning')
@ApiBearerAuth()
@ApiSecurity('tenant-id')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('decisions')
export class DecisioningController {
  constructor(private readonly decisioningService: DecisioningService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'AI-assisted campaign decisioning',
    description:
      'Transforms a natural-language business goal into a complete campaign recommendation: audience, offer, channel, message template, and reasoning.',
  })
  @ApiResponse({
    status: 201,
    description: 'Decision created with full recommendation',
  })
  async decide(@Body() dto: CreateDecisionDto, @TenantId() tenantId: string) {
    return this.decisioningService.decide(tenantId, dto.goal);
  }
}
