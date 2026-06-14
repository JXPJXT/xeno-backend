import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContextService } from '../../core/tenant-context/tenant-context.service';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
} from './dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private get tenantId() {
    return this.tenantContext.requireTenantId();
  }
  private get db() {
    return this.prisma.forTenant(this.tenantId);
  }

  // ===== CATEGORIES =====

  async findAllCategories() {
    return this.db.productCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        children: true,
        _count: { select: { products: true } },
      },
    });
  }

  async findCategoryById(id: string) {
    const cat = await this.db.productCategory.findFirst({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: { take: 10 },
        _count: { select: { products: true } },
      },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async createCategory(dto: CreateProductCategoryDto) {
    return this.db.productCategory.create({ data: dto as any });
  }

  async updateCategory(id: string, dto: UpdateProductCategoryDto) {
    await this.findCategoryById(id);
    return this.db.productCategory.update({
      where: { id },
      data: dto as any,
    });
  }

  async deleteCategory(id: string) {
    await this.findCategoryById(id);
    return this.db.productCategory.delete({ where: { id } });
  }

  // ===== PRODUCTS =====

  async findAllProducts(filter: ProductFilterDto) {
    const where: any = {};

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { sku: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    if (filter.status) where.status = filter.status;
    if (filter.categoryId) where.categoryId = filter.categoryId;

    const skip = (filter.page - 1) * filter.limit;

    const [items, total] = await Promise.all([
      this.db.product.findMany({
        where,
        orderBy: { [filter.sortBy]: filter.sortOrder },
        skip,
        take: filter.limit,
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.db.product.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(total / filter.limit),
      },
    };
  }

  async findProductById(id: string) {
    const product = await this.db.product.findFirst({
      where: { id },
      include: {
        category: true,
        attributeValues: { include: { attribute: true } },
        _count: { select: { affinities: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createProduct(dto: CreateProductDto) {
    if (dto.sku) {
      const existing = await this.db.product.findFirst({
        where: { sku: dto.sku },
      });
      if (existing)
        throw new ConflictException('Product with this SKU already exists');
    }
    return this.db.product.create({
      data: dto as any,
      include: { category: true },
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.findProductById(id);
    return this.db.product.update({
      where: { id },
      data: dto as any,
      include: { category: true },
    });
  }

  async deleteProduct(id: string) {
    await this.findProductById(id);
    return this.db.product.delete({ where: { id } });
  }

  // ===== CUSTOMER PRODUCT AFFINITIES =====

  async getAffinities(params: {
    customerId?: string;
    productId?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {};
    if (params.customerId) where.customerId = params.customerId;
    if (params.productId) where.productId = params.productId;

    const skip = (params.page - 1) * params.limit;

    const [items, total] = await Promise.all([
      this.db.customerProductAffinity.findMany({
        where,
        orderBy: { affinityScore: 'desc' },
        skip,
        take: params.limit,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          product: { select: { id: true, name: true, sku: true } },
        },
      }),
      this.db.customerProductAffinity.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }
}
