import { SetMetadata } from '@nestjs/common';
import { PermissionName } from '../enums/permission.enum';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: PermissionName[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
