import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { RoleName } from '../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ValidateIf((value: CreateUserDto) => !value.phone && !value.email)
  @IsString()
  @MinLength(3)
  username?: string;

  @ValidateIf((value: CreateUserDto) => !value.username && !value.email)
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/)
  phone?: string;

  @ValidateIf((value: CreateUserDto) => !value.username && !value.phone)
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(RoleName, { each: true })
  roleNames?: RoleName[];
}
