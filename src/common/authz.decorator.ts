import { SetMetadata } from '@nestjs/common';

export type AppRole = 'admin' | 'ops' | 'support' | 'merchant';

export const AUTHORIZE_ROLES_KEY = 'authorize_roles';

export const Authorize = (...roles: AppRole[]) => SetMetadata(AUTHORIZE_ROLES_KEY, roles);
