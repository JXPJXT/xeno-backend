import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict access to specific roles.
 * Used with RolesGuard.
 *
 * Usage:
 * ```
 * @Roles(UserRole.ADMIN, UserRole.MANAGER)
 * @Get()
 * findAll() { ... }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
