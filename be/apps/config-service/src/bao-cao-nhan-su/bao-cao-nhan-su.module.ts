import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { Employee, EmploymentHistory, Timesheet } from '@app/entities';
import { BaoCaoNhanSu_Controller } from './bao-cao-nhan-su.controller';
import { BaoCaoNhanSu_Service } from './bao-cao-nhan-su.service';

/** Chỉ ĐỌC ba bảng — module này không có route ghi nào. */
@Module({
  imports: [
    DatabaseModule.forFeature([Employee, EmploymentHistory, Timesheet]),
  ],
  controllers: [BaoCaoNhanSu_Controller],
  providers: [BaoCaoNhanSu_Service],
  exports: [BaoCaoNhanSu_Service],
})
export class BaoCaoNhanSu_Module {}
