import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';
import { RoleName } from '../../common/enums/role.enum';

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(RoleName, { each: true })
  roleNames!: RoleName[];
}
