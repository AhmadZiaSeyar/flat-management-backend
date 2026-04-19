import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionName } from '../common/enums/permission.enum';
import { RoleName } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpsertFoodTimetableDto } from './dto/upsert-food-timetable.dto';
import { FoodTimetableService } from './food-timetable.service';

@Controller('food-timetable')
export class FoodTimetableController {
  constructor(private readonly foodTimetableService: FoodTimetableService) {}

  @Permissions(PermissionName.ViewFoodTimetable)
  @Get()
  getWeeklyPlan() {
    return this.foodTimetableService.getWeeklyPlan();
  }

  @Roles(RoleName.Admin)
  @Put()
  upsertWeeklyPlan(
    @Body() upsertFoodTimetableDto: UpsertFoodTimetableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.foodTimetableService.upsertWeeklyPlan(upsertFoodTimetableDto, user);
  }
}
