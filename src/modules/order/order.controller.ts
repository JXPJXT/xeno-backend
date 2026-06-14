import {
  Controller,
  Get,
  Post,
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
  ApiBearerAuth,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OrderService } from './order.service';
import {
  OrderFilterDto,
  CreateOrderDto,
  CreateOrderItemDto,
} from '../product/dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';

@ApiTags('Orders')
@ApiBearerAuth()
@ApiSecurity('tenant-id')
@Controller('orders')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({
    summary: 'List orders with pagination, filtering, and search',
  })
  findAll(@Query() filter: OrderFilterDto) {
    return this.orderService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID with items' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETER)
  @ApiOperation({ summary: 'Create an order' })
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Get order items' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getItems(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.findOrderItems(id);
  }

  @Post('items')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETER)
  @ApiOperation({ summary: 'Add an item to an order' })
  createItem(@Body() dto: CreateOrderItemDto) {
    return this.orderService.createOrderItem(dto);
  }

  @Delete('items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an order item' })
  @ApiParam({ name: 'itemId', type: 'string', format: 'uuid' })
  removeItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.orderService.deleteOrderItem(itemId);
  }
}
