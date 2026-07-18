import { Module } from '@nestjs/common';
import { AttendanceLocation } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { DiaDiemChamCong_Service } from './dia-diem-cham-cong.service';
import { DiaDiemChamCong_Controller } from './dia-diem-cham-cong.controller';

@Module({
  imports: [DatabaseModule.forFeature([AttendanceLocation])],
  controllers: [DiaDiemChamCong_Controller],
  providers: [DiaDiemChamCong_Service],
  exports: [DiaDiemChamCong_Service],
})
export class DiaDiemChamCong_Module {}
