import { Module } from '@nestjs/common';
import { CauHinhLuong, DongLuong, Employee, Timesheet } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { BangLuong_Service } from './bang-luong.service';
import { BangLuong_Controller } from './bang-luong.controller';

@Module({
  imports: [DatabaseModule.forFeature([CauHinhLuong, DongLuong, Employee, Timesheet])],
  controllers: [BangLuong_Controller],
  providers: [BangLuong_Service],
  exports: [BangLuong_Service],
})
export class BangLuong_Module {}
