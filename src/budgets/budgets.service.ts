import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { getMonthRange } from '../common/utils/date.utils';
import { toMoneyNumber } from '../common/utils/number.utils';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetQueryDto } from './dto/budget-query.dto';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentBudget(budgetQueryDto: BudgetQueryDto) {
    const reference = new Date();
    const year = budgetQueryDto.year ?? reference.getFullYear();
    const month = budgetQueryDto.month ?? reference.getMonth() + 1;

    const budget = await this.prisma.budget.findUnique({
      where: {
        year_month: {
          year,
          month,
        },
      },
      include: {
        createdBy: true,
      },
    });

    if (!budget) {
      return {
        year,
        month,
        amount: 0,
        spent: 0,
        remaining: 0,
        percentageUsed: 0,
        setBy: null,
        updatedAt: null,
      };
    }

    const spent = await this.getSpentForMonth(year, month);
    const amount = toMoneyNumber(budget.amount);

    return {
      id: budget.id,
      year,
      month,
      amount,
      spent,
      remaining: Math.max(amount - spent, 0),
      percentageUsed: amount > 0 ? Number(((spent / amount) * 100).toFixed(1)) : 0,
      setBy: budget.createdBy
        ? {
            id: budget.createdBy.id,
            fullName: budget.createdBy.fullName,
          }
        : null,
      updatedAt: budget.updatedAt,
    };
  }

  async upsertCurrentBudget(upsertBudgetDto: UpsertBudgetDto, user: AuthenticatedUser) {
    const budget = await this.prisma.budget.upsert({
      where: {
        year_month: {
          year: upsertBudgetDto.year,
          month: upsertBudgetDto.month,
        },
      },
      update: {
        amount: new Prisma.Decimal(upsertBudgetDto.amount),
        createdById: user.id,
      },
      create: {
        year: upsertBudgetDto.year,
        month: upsertBudgetDto.month,
        amount: new Prisma.Decimal(upsertBudgetDto.amount),
        createdById: user.id,
      },
    });

    const spent = await this.getSpentForMonth(upsertBudgetDto.year, upsertBudgetDto.month);

    return {
      id: budget.id,
      year: budget.year,
      month: budget.month,
      amount: toMoneyNumber(budget.amount),
      spent,
      remaining: Math.max(upsertBudgetDto.amount - spent, 0),
      percentageUsed:
        upsertBudgetDto.amount > 0
          ? Number(((spent / upsertBudgetDto.amount) * 100).toFixed(1))
          : 0,
      setBy: {
        id: user.id,
        fullName: user.fullName,
      },
      updatedAt: budget.updatedAt,
    };
  }

  private async getSpentForMonth(year: number, month: number) {
    const range = getMonthRange(new Date(year, month - 1, 1));
    const aggregate = await this.prisma.expense.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        expenseDate: {
          gte: range.start,
          lte: range.end,
        },
      },
    });

    return aggregate._sum.amount ? toMoneyNumber(aggregate._sum.amount) : 0;
  }
}
