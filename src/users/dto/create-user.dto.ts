import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { RoleName } from '../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ValidateIf((value: CreateUserDto) => !value.phone)
  @IsString()
  @MinLength(3)
  username?: string;

  @ValidateIf((value: CreateUserDto) => !value.username)
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/)
  phone?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(4, 6)
  pin?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(RoleName, { each: true })
  roleNames?: RoleName[];
}
