import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class FoodTimetableDayInputDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  breakfast?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lunch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  dinner?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  note?: string;
}

export class UpsertFoodTimetableDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FoodTimetableDayInputDto)
  days!: FoodTimetableDayInputDto[];
}
