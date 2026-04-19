import { PermissionName } from '../../common/enums/permission.enum';
import { RoleName } from '../../common/enums/role.enum';

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  username: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  roles: RoleName[];
  permissions: PermissionName[];
}
