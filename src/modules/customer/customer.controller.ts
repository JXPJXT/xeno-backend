import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CustomerService } from './customer.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerFilterDto,
  CreateCustomerAddressDto,
  CreateCustomerChannelDto,
  UpsertCustomerPreferenceDto,
  CreateCustomerConsentDto,
  CreateCustomerDeviceDto,
  AssignTagDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';

@ApiTags('Customers')
@ApiBearerAuth()
@ApiSecurity('tenant-id')
@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  // ===== CUSTOMER CRUD =====

  @Get()
  @ApiOperation({
    summary: 'List customers with pagination, filtering, and search',
  })
  @ApiResponse({ status: 200, description: 'Paginated customer list' })
  findAll(@Query() filter: CustomerFilterDto) {
    return this.customerService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID with all related data' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Customer detail' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETER)
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  @ApiResponse({ status: 409, description: 'Duplicate email' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customerService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETER)
  @ApiOperation({ summary: 'Update customer' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a customer' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.remove(id);
  }

  // ===== ADDRESSES =====

  @Get(':id/addresses')
  @ApiOperation({ summary: 'Get customer addresses' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getAddresses(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.getAddresses(id);
  }

  @Post(':id/addresses')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETER)
  @ApiOperation({ summary: 'Add a customer address' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  createAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.customerService.createAddress(id, dto);
  }

  @Delete(':id/addresses/:addressId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a customer address' })
  deleteAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.customerService.deleteAddress(id, addressId);
  }

  // ===== CHANNELS =====

  @Get(':id/channels')
  @ApiOperation({ summary: 'Get customer communication channels' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getChannels(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.getChannels(id);
  }

  @Post(':id/channels')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETER)
  @ApiOperation({ summary: 'Add a communication channel' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  createChannel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCustomerChannelDto,
  ) {
    return this.customerService.createChannel(id, dto);
  }

  @Delete(':id/channels/:channelId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a communication channel' })
  deleteChannel(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.customerService.deleteChannel(id, channelId);
  }

  // ===== PREFERENCES =====

  @Get(':id/preferences')
  @ApiOperation({ summary: 'Get customer communication preferences' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getPreferences(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.getPreferences(id);
  }

  @Put(':id/preferences')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETER)
  @ApiOperation({ summary: 'Create or update communication preferences' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  upsertPreferences(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertCustomerPreferenceDto,
  ) {
    return this.customerService.upsertPreferences(id, dto);
  }

  // ===== CONSENTS =====

  @Get(':id/consents')
  @ApiOperation({ summary: 'Get customer consent records' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getConsents(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.getConsents(id);
  }

  @Post(':id/consents')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETER)
  @ApiOperation({ summary: 'Record customer consent' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  createConsent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCustomerConsentDto,
  ) {
    return this.customerService.createConsent(id, dto);
  }

  // ===== DEVICES =====

  @Get(':id/devices')
  @ApiOperation({ summary: 'Get customer devices' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getDevices(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.getDevices(id);
  }

  @Post(':id/devices')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETER)
  @ApiOperation({ summary: 'Register a customer device' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  createDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCustomerDeviceDto,
  ) {
    return this.customerService.createDevice(id, dto);
  }

  @Delete(':id/devices/:deviceId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a customer device' })
  deleteDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ) {
    return this.customerService.deleteDevice(id, deviceId);
  }

  // ===== TAGS =====

  @Get(':id/tags')
  @ApiOperation({ summary: 'Get customer tags' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getTags(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.getTags(id);
  }

  @Post(':id/tags')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETER)
  @ApiOperation({ summary: 'Assign a tag to customer' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  assignTag(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignTagDto) {
    return this.customerService.assignTag(id, dto);
  }

  @Delete(':id/tags/:tagId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a tag from customer' })
  removeTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    return this.customerService.removeTag(id, tagId);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get chronological activity stream for a customer' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getTimeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.getTimeline(id);
  }
}
