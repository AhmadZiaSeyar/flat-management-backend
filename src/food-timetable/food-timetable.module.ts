import { Module } from '@nestjs/common';
import { FoodTimetableController } from './food-timetable.controller';
import { FoodTimetableService } from './food-timetable.service';

@Module({
  controllers: [FoodTimetableController],
  providers: [FoodTimetableService],
  exports: [FoodTimetableService],
})
export class FoodTimetableModule {}
