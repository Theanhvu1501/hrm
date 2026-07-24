import { Module } from '@nestjs/common';
import { AttendanceRequest, Employee } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NgayLe_Module } from '../ngay-le/ngay-le.module';
import { DonChamCong_Service } from './don-cham-cong.service';
import { DonChamCong_Controller } from './don-cham-cong.controller';

@Module({
  imports: [
    DatabaseModule.forFeature([AttendanceRequest, Employee]),
    NgayLe_Module,
  ],
  controllers: [DonChamCong_Controller],
  providers: [DonChamCong_Service],
  exports: [DonChamCong_Service],
})
export class DonChamCong_Module {}
