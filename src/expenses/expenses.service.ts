import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { getDayRange, getMonthRange, getWeekRange } from '../common/utils/date.utils';
import { toMoneyNumber } from '../common/utils/number.utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseRange, ListExpensesDto } from './dto/list-expenses.dto';

const expenseInclude = {
  category: true,
  createdBy: true,
} satisfies Prisma.ExpenseInclude;

type ExpenseWithRelations = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>;

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createExpenseDto: CreateExpenseDto, user: AuthenticatedUser) {
    const category = await this.prisma.category.findUnique({
      where: { id: createExpenseDto.categoryId },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Category not found.');
    }

    const expense = await this.prisma.expense.create({
      data: {
        amount: new Prisma.Decimal(createExpenseDto.amount),
        note: createExpenseDto.note?.trim() || null,
        expenseDate: createExpenseDto.expenseDate
          ? new Date(createExpenseDto.expenseDate)
          : new Date(),
        categoryId: createExpenseDto.categoryId,
        createdById: user.id,
      },
      include: expenseInclude,
    });

    return this.serializeExpense(expense);
  }

  async findAll(listExpensesDto: ListExpensesDto) {
    const reference = new Date();
    let range: { start: Date; end: Date } | null = null;

    if (listExpensesDto.range === ExpenseRange.Today) {
      range = getDayRange(reference);
    }

    if (listExpensesDto.range === ExpenseRange.Week) {
      range = getWeekRange(reference);
    }

    if (listExpensesDto.range === ExpenseRange.Month) {
      range = getMonthRange(reference);
    }

    const expenses = await this.prisma.expense.findMany({
      where: range
        ? {
            expenseDate: {
              gte: range.start,
              lte: range.end,
            },
          }
        : undefined,
      include: expenseInclude,
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });

    return expenses.map((expense) => this.serializeExpense(expense));
  }

  async clearAll() {
    const result = await this.prisma.expense.deleteMany();

    return {
      deletedCount: result.count,
    };
  }

  private serializeExpense(expense: ExpenseWithRelations) {
    return {
      id: expense.id,
      amount: toMoneyNumber(expense.amount),
      note: expense.note,
      expenseDate: expense.expenseDate,
      createdAt: expense.createdAt,
      category: {
        id: expense.category.id,
        name: expense.category.name,
        icon: expense.category.icon,
        color: expense.category.color,
      },
      createdBy: {
        id: expense.createdBy.id,
        fullName: expense.createdBy.fullName,
        username: expense.createdBy.username,
      },
    };
  }
}
