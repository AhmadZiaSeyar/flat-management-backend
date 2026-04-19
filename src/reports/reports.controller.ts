import { Controller, Get, Query } from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionName } from '../common/enums/permission.enum';
import { ReportRangeDto } from './dto/report-range.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Permissions(PermissionName.ViewReports)
  @Get('weekly')
  weekly(@Query() reportRangeDto: ReportRangeDto) {
    return this.reportsService.getWeekly(reportRangeDto.date);
  }

  @Permissions(PermissionName.ViewReports)
  @Get('monthly')
  monthly(@Query() reportRangeDto: ReportRangeDto) {
    return this.reportsService.getMonthly(reportRangeDto.date);
  }
}
