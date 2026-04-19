import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getMonthRange, getWeekRange, getYearMonth } from '../common/utils/date.utils';
import { toMoneyNumber } from '../common/utils/number.utils';
import { PrismaService } from '../prisma/prisma.service';

const reportExpenseInclude = {
  category: true,
  createdBy: true,
} satisfies Prisma.ExpenseInclude;

type ReportExpense = Prisma.ExpenseGetPayload<{ include: typeof reportExpenseInclude }>;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeekly(date?: string) {
    const reference = date ? new Date(date) : new Date();
    const range = getWeekRange(reference);

    return this.buildReport('weekly', reference, range.start, range.end);
  }

  async getMonthly(date?: string) {
    const reference = date ? new Date(date) : new Date();
    const range = getMonthRange(reference);

    return this.buildReport('monthly', reference, range.start, range.end);
  }

  private async buildReport(
    scope: 'weekly' | 'monthly',
    reference: Date,
    start: Date,
    end: Date,
  ) {
    const expenses = await this.prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: start,
          lte: end,
        },
      },
      include: reportExpenseInclude,
      orderBy: {
        expenseDate: 'asc',
      },
    });

    const totals = this.accumulate(expenses);
    const { year, month } = getYearMonth(reference);
    const budget = await this.prisma.budget.findUnique({
      where: {
        year_month: {
          year,
          month,
        },
      },
    });

    const budgetAmount = budget ? toMoneyNumber(budget.amount) : null;
    const spent = totals.total;

    return {
      scope,
      startDate: start,
      endDate: end,
      total: spent,
      expenseCount: expenses.length,
      byCategory: totals.byCategory,
      byUser: totals.byUser,
      dailyTotals: totals.dailyTotals,
      budget: budgetAmount
        ? {
            amount: budgetAmount,
            spent,
            remaining: Math.max(budgetAmount - spent, 0),
            percentageUsed: Number(((spent / budgetAmount) * 100).toFixed(1)),
          }
        : null,
    };
  }

  private accumulate(expenses: ReportExpense[]) {
    let total = 0;
    const categoryMap = new Map<string, { id: string; name: string; color: string; total: number }>();
    const userMap = new Map<string, { id: string; fullName: string; total: number }>();
    const dailyMap = new Map<string, number>();

    for (const expense of expenses) {
      const amount = toMoneyNumber(expense.amount);
      total += amount;

      const categoryEntry = categoryMap.get(expense.category.id) ?? {
        id: expense.category.id,
        name: expense.category.name,
        color: expense.category.color,
        total: 0,
      };
      categoryEntry.total += amount;
      categoryMap.set(expense.category.id, categoryEntry);

      const userEntry = userMap.get(expense.createdBy.id) ?? {
        id: expense.createdBy.id,
        fullName: expense.createdBy.fullName,
        total: 0,
      };
      userEntry.total += amount;
      userMap.set(expense.createdBy.id, userEntry);

      const dayKey = expense.expenseDate.toISOString().slice(0, 10);
      dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + amount);
    }

    return {
      total: Number(total.toFixed(2)),
      byCategory: Array.from(categoryMap.values()).sort((left, right) => right.total - left.total),
      byUser: Array.from(userMap.values()).sort((left, right) => right.total - left.total),
      dailyTotals: Array.from(dailyMap.entries()).map(([date, amount]) => ({
        date,
        total: Number(amount.toFixed(2)),
      })),
    };
  }
}
