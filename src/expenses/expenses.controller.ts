import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionName } from '../common/enums/permission.enum';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesDto } from './dto/list-expenses.dto';
import { ExpensesService } from './expenses.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Permissions(PermissionName.AddExpense)
  @Post()
  create(
    @Body() createExpenseDto: CreateExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.expensesService.create(createExpenseDto, user);
  }

  @Permissions(PermissionName.ViewExpense)
  @Get()
  findAll(@Query() listExpensesDto: ListExpensesDto) {
    return this.expensesService.findAll(listExpensesDto);
  }
}
