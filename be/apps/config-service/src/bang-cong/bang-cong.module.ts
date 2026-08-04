import { Module } from '@nestjs/common';
import {
  Timesheet,
  Employee,
  AttendanceRequest,
  AttendanceRecord,
  Holiday,
  Resignation,
} from '@app/entities';
import { DatabaseModule } from '@app/database';
import { QuyPhep_Module } from '../quy-phep/quy-phep.module';
import { BangCong_Service } from './bang-cong.service';
import { BangCong_Controller } from './bang-cong.controller';

@Module({
  imports: [
    DatabaseModule.forFeature([
      Timesheet,
      Employee,
      AttendanceRequest,
      AttendanceRecord,
      Holiday,
      Resignation,
    ]),
    // (P3.10) finalize() tích phép năm cho tháng vừa chốt.
    QuyPhep_Module,
  ],
  controllers: [BangCong_Controller],
  providers: [BangCong_Service],
  exports: [BangCong_Service],
})
export class BangCong_Module {}
