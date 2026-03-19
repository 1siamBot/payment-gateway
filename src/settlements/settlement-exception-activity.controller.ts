import { Controller, Get, Param, Query } from '@nestjs/common';
import { Authorize } from '../common/authz.decorator';
import { ListSettlementExceptionActivityDto } from './dto/list-settlement-exception-activity.dto';
import { SettlementsService } from './settlements.service';

@Controller('settlement-exceptions')
@Authorize('ops', 'admin')
export class SettlementExceptionActivityController {
  constructor(private readonly settlements: SettlementsService) {}

  @Get(':exceptionId/activity')
  getActivityTimeline(
    @Param('exceptionId') exceptionId: string,
    @Query() query: ListSettlementExceptionActivityDto,
  ) {
    return this.settlements.getSettlementExceptionActivityTimeline(exceptionId, query);
  }
}
