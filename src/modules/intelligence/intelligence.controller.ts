import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IntelligenceService } from './intelligence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, TenantId } from '../../common/decorators';

@ApiTags('Intelligence')
@ApiBearerAuth()
@ApiSecurity('tenant-id')
@Controller('intelligence')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  // ===== COMPUTATION =====

  @Post('compute')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run full intelligence computation pipeline for tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Intelligence computation complete',
  })
  computeAll(@TenantId() tenantId: string) {
    return this.intelligenceService.computeAll(tenantId);
  }

  // ===== CUSTOMER 360 =====

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get Customer 360 Intelligence view' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Customer 360 intelligence' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  getCustomer360(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.intelligenceService.getCustomer360(tenantId, id);
  }

  // ===== EXPLAIN =====

  @Get('customers/:id/explain')
  @ApiOperation({ summary: 'Explain customer personas, segments, and scores' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Customer intelligence explanation',
  })
  explainCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.intelligenceService.explainCustomer(tenantId, id);
  }
}
