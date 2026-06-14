import {
  Controller,
  Get,
  Post,
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
  ApiBearerAuth,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProductService } from './product.service';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';

// ===== PRODUCT CATEGORIES =====

@ApiTags('Product Categories')
@ApiBearerAuth()
@ApiSecurity('tenant-id')
@Controller('product-categories')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProductCategoryController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'List all product categories' })
  findAll() {
    return this.productService.findAllCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findCategoryById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create product category' })
  create(@Body() dto: CreateProductCategoryDto) {
    return this.productService.createCategory(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update product category' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.productService.updateCategory(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete product category' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.deleteCategory(id);
  }
}

// ===== PRODUCTS =====

@ApiTags('Products')
@ApiBearerAuth()
@ApiSecurity('tenant-id')
@Controller('products')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({
    summary: 'List products with pagination, filtering, and search',
  })
  findAll(@Query() filter: ProductFilterDto) {
    return this.productService.findAllProducts(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID with attributes' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findProductById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a product' })
  create(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.deleteProduct(id);
  }
}

// ===== CUSTOMER PRODUCT AFFINITIES =====

@ApiTags('Customer Product Affinities')
@ApiBearerAuth()
@ApiSecurity('tenant-id')
@Controller('customer-product-affinities')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class CustomerProductAffinityController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'List customer-product affinities' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('customerId') customerId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.productService.getAffinities({
      customerId,
      productId,
      page: pagination.page,
      limit: pagination.limit,
    });
  }
}
