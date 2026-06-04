import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// ใช้ @Roles('doctor') บน route ที่ต้องการแค่แพทย์เท่านั้น
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
