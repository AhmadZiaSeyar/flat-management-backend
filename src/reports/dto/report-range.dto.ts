import { IsDateString, IsOptional } from 'class-validator';

export class ReportRangeDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
