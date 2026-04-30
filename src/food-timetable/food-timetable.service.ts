import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpsertFoodTimetableDto } from './dto/upsert-food-timetable.dto';

const WEEK_DAYS = [5, 6, 7, 1, 2, 3, 4] as const;

@Injectable()
export class FoodTimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeeklyPlan() {
    const days = await this.prisma.foodTimetableDay.findMany({
      include: {
        updatedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        dayOfWeek: 'asc',
      },
    });

    const dayMap = new Map(days.map((day) => [day.dayOfWeek, day]));

    return WEEK_DAYS.map((dayOfWeek) => {
      const day = dayMap.get(dayOfWeek);

      return {
        dayOfWeek,
        breakfast: day?.breakfast ?? null,
        lunch: day?.lunch ?? null,
        dinner: day?.dinner ?? null,
        note: day?.note ?? null,
        updatedAt: day?.updatedAt ?? null,
        updatedBy: day?.updatedBy ?? null,
      };
    });
  }

  async upsertWeeklyPlan(upsertFoodTimetableDto: UpsertFoodTimetableDto, user: AuthenticatedUser) {
    const uniqueDayCount = new Set(upsertFoodTimetableDto.days.map((day) => day.dayOfWeek)).size;

    if (uniqueDayCount !== upsertFoodTimetableDto.days.length) {
      throw new BadRequestException('Each weekday can only appear once.');
    }

    await this.prisma.$transaction(
      upsertFoodTimetableDto.days.map((day) => {
        const normalizedDay = {
          breakfast: normalizeNullableString(day.breakfast),
          lunch: normalizeNullableString(day.lunch),
          dinner: normalizeNullableString(day.dinner),
          note: normalizeNullableString(day.note),
        };

        const hasAnyContent = Object.values(normalizedDay).some(Boolean);

        if (!hasAnyContent) {
          return this.prisma.foodTimetableDay.deleteMany({
            where: { dayOfWeek: day.dayOfWeek },
          });
        }

        return this.prisma.foodTimetableDay.upsert({
          where: {
            dayOfWeek: day.dayOfWeek,
          },
          update: {
            ...normalizedDay,
            updatedById: user.id,
          },
          create: {
            dayOfWeek: day.dayOfWeek,
            ...normalizedDay,
            updatedById: user.id,
          },
        });
      }),
    );

    return this.getWeeklyPlan();
  }
}

function normalizeNullableString(value?: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}
