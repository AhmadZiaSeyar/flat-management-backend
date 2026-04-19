import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionName } from '../enums/permission.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<PermissionName[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!requiredPermissions.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user?.permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    return true;
  }
}
