import { Module } from '@nestjs/common';
import { EmployeeDevice } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NhanVien_Module } from '../nhan-vien/nhan-vien.module';
import { ThietBiChamCong_Service } from './thiet-bi-cham-cong.service';
import { ThietBiChamCong_Controller } from './thiet-bi-cham-cong.controller';

@Module({
  imports: [DatabaseModule.forFeature([EmployeeDevice]), NhanVien_Module],
  controllers: [ThietBiChamCong_Controller],
  providers: [ThietBiChamCong_Service],
  exports: [ThietBiChamCong_Service],
})
export class ThietBiChamCong_Module {}
