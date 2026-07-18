import { Module } from '@nestjs/common';
import { PhieuTemplate } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { PhieuTemplate_Service } from './phieu-template.service';
import { PhieuTemplate_Controller } from './phieu-template.controller';

@Module({
  imports: [DatabaseModule.forFeature([PhieuTemplate])],
  controllers: [PhieuTemplate_Controller],
  providers: [PhieuTemplate_Service],
  exports: [PhieuTemplate_Service],
})
export class PhieuTemplate_Module {}
