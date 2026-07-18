import { Module } from '@nestjs/common';
import { Employee, EmployeeCounter } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { NhanVien_Service } from './nhan-vien.service';
import { NhanVien_Controller } from './nhan-vien.controller';

@Module({
  imports: [DatabaseModule.forFeature([Employee, EmployeeCounter]), TenantModule],
  controllers: [NhanVien_Controller],
  providers: [NhanVien_Service],
  exports: [NhanVien_Service],
})
export class NhanVien_Module {}
