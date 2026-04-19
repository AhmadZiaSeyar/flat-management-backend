import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ValidateIf((value: LoginDto) => !value.pin)
  @IsString()
  @MinLength(6)
  password?: string;

  @ValidateIf((value: LoginDto) => !value.password)
  @IsString()
  @Length(4, 6)
  pin?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}
