import { IsEnum, IsOptional } from 'class-validator';

export enum ExpenseRange {
  Today = 'today',
  Week = 'week',
  Month = 'month',
}

export class ListExpensesDto {
  @IsOptional()
  @IsEnum(ExpenseRange)
  range?: ExpenseRange;
}
