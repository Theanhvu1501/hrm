import { Module } from '@nestjs/common';
import { Holiday } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NgayLe_Service } from './ngay-le.service';
import { NgayLe_Controller } from './ngay-le.controller';

@Module({
  imports: [DatabaseModule.forFeature([Holiday])],
  controllers: [NgayLe_Controller],
  providers: [NgayLe_Service],
  exports: [NgayLe_Service],
})
export class NgayLe_Module {}
