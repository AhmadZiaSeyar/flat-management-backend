import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionName } from '../common/enums/permission.enum';
import { RoleName } from '../common/enums/role.enum';
import { BudgetQueryDto } from './dto/budget-query.dto';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';
import { BudgetsService } from './budgets.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Permissions(PermissionName.ViewReports)
  @Get('current')
  getCurrent(@Query() budgetQueryDto: BudgetQueryDto) {
    return this.budgetsService.getCurrentBudget(budgetQueryDto);
  }

  @Roles(RoleName.Admin)
  @Put('current')
  upsert(
    @Body() upsertBudgetDto: UpsertBudgetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.budgetsService.upsertCurrentBudget(upsertBudgetDto, user);
  }
}
