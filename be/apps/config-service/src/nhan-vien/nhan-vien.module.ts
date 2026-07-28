import { Module, forwardRef } from '@nestjs/common';
import { Employee, EmployeeCounter } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { NhanVien_Service } from './nhan-vien.service';
import { NhanVien_Controller } from './nhan-vien.controller';
import { QuyPhep_Module } from '../quy-phep/quy-phep.module';

@Module({
  imports: [
    DatabaseModule.forFeature([Employee, EmployeeCounter]),
    TenantModule,
    // Vòng phụ thuộc CỐ Ý (P3.8, Task 9): QuyPhep_Module import NhanVien_Module
    // (controller cần resolveEmployeeFromUser), còn NhanVien_Module import
    // ngược lại QuyPhep_Module vì NhanVien_Service cần gọi
    // moKhoaLenChinhThuc() khi hồ sơ vừa được điền ngayChinhThuc. forwardRef()
    // ở CẢ HAI module + ở constructor injection (nhan-vien.service.ts) là bắt
    // buộc — thiếu một chỗ là Nest báo lỗi "circular dependency" lúc boot.
    forwardRef(() => QuyPhep_Module),
  ],
  controllers: [NhanVien_Controller],
  providers: [NhanVien_Service],
  exports: [NhanVien_Service],
})
export class NhanVien_Module {}
