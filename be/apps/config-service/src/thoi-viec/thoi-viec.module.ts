import { Module } from '@nestjs/common';
import { Resignation, Employee, EmploymentHistory } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { ThoiViec_Service } from './thoi-viec.service';
import { ThoiViec_Controller } from './thoi-viec.controller';
import { DinhKem_Module } from '../dinh-kem/dinh-kem.module';

@Module({
  imports: [
    // `EmploymentHistory` để tự ghi một dòng vào Quá trình công tác khi thôi
    // việc có hiệu lực — lấy repo thẳng thay vì import QuaTrinhCongTac_Module
    // vì `create()` bên đó đòi token identity và đòi chứng từ đính kèm, hai
    // thứ không có nghĩa với dòng sinh tự động này.
    DatabaseModule.forFeature([Resignation, Employee, EmploymentHistory]),
    DinhKem_Module,
  ],
  controllers: [ThoiViec_Controller],
  providers: [ThoiViec_Service],
  exports: [ThoiViec_Service],
})
export class ThoiViec_Module {}
