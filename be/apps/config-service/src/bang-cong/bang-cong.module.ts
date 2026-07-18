import { Module } from '@nestjs/common';
import { Timesheet, Employee, AttendanceRequest } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { BangCong_Service } from './bang-cong.service';
import { BangCong_Controller } from './bang-cong.controller';

@Module({
  imports: [DatabaseModule.forFeature([Timesheet, Employee, AttendanceRequest])],
  controllers: [BangCong_Controller],
  providers: [BangCong_Service],
  exports: [BangCong_Service],
})
export class BangCong_Module {}
