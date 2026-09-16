import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { Employee, TamUngLuong } from '@app/entities';
import { TamUng_Controller } from './tam-ung.controller';
import { TamUng_Service } from './tam-ung.service';
import { NhanVien_Module } from '../nhan-vien/nhan-vien.module';

/**
 * `NhanVien_Module` để suy hồ sơ NV từ token ở nhánh `cua-toi`; repo
 * `Employee` để điền tên/mã lúc lập đơn (denormalize như các module khác).
 */
@Module({
  imports: [
    DatabaseModule.forFeature([TamUngLuong, Employee]),
    NhanVien_Module,
  ],
  controllers: [TamUng_Controller],
  providers: [TamUng_Service],
  exports: [TamUng_Service],
})
export class TamUng_Module {}
