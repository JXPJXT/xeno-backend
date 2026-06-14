import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public (no JWT required).
 * Used for health checks, login endpoints, etc.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
