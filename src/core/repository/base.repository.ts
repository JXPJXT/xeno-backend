import { PrismaService } from '../prisma/prisma.service';

/**
 * Pagination result wrapper for consistent API responses.
 */
export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Pagination options for list queries.
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * BaseRepository provides standard CRUD operations for any Prisma model.
 *
 * This is NOT tenant-aware — use TenantAwareRepository for tenant-scoped entities.
 * Only use BaseRepository for system-level entities (e.g., Tenant itself).
 *
 * All future modules MUST use repositories instead of direct Prisma access.
 *
 * @template T - The Prisma model delegate type
 */
export abstract class BaseRepository<T = any> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  /**
   * Get the Prisma model delegate for this repository.
   */
  protected get model(): any {
    return (this.prisma as any)[this.modelName];
  }

  /**
   * Find a single record by its unique ID.
   */
  async findById(id: string, include?: Record<string, any>): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      ...(include && { include }),
    });
  }

  /**
   * Find a single record by arbitrary criteria.
   */
  async findOne(
    where: Record<string, any>,
    include?: Record<string, any>,
  ): Promise<T | null> {
    return this.model.findFirst({
      where,
      ...(include && { include }),
    });
  }

  /**
   * Find multiple records with optional filtering and pagination.
   */
  async findMany(options?: {
    where?: Record<string, any>;
    include?: Record<string, any>;
    orderBy?: Record<string, any>;
    skip?: number;
    take?: number;
  }): Promise<T[]> {
    return this.model.findMany(options || {});
  }

  /**
   * Find records with pagination metadata.
   */
  async findPaginated(
    options: PaginationOptions & {
      where?: Record<string, any>;
      include?: Record<string, any>;
    },
  ): Promise<PaginatedResult<T>> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    const [items, total] = await Promise.all([
      this.model.findMany({
        where: options.where,
        include: options.include,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.model.count({ where: options.where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new record.
   */
  async create(
    data: Record<string, any>,
    include?: Record<string, any>,
  ): Promise<T> {
    return this.model.create({
      data,
      ...(include && { include }),
    });
  }

  /**
   * Update a record by ID.
   */
  async update(
    id: string,
    data: Record<string, any>,
    include?: Record<string, any>,
  ): Promise<T> {
    return this.model.update({
      where: { id },
      data,
      ...(include && { include }),
    });
  }

  /**
   * Delete a record by ID (hard delete).
   */
  async delete(id: string): Promise<T> {
    return this.model.delete({ where: { id } });
  }

  /**
   * Soft delete a record by setting deleted_at.
   * Only works on models with a deletedAt field.
   */
  async softDelete(id: string): Promise<T> {
    return this.model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Count records matching criteria.
   */
  async count(where?: Record<string, any>): Promise<number> {
    return this.model.count({ where });
  }

  /**
   * Check if a record exists.
   */
  async exists(where: Record<string, any>): Promise<boolean> {
    const count = await this.model.count({ where });
    return count > 0;
  }
}
