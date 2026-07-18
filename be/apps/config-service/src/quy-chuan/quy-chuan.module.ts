import { Module } from '@nestjs/common';
import { QuyChuan } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { QuyChuan_Service } from './quy-chuan.service';
import { QuyChuan_Controller } from './quy-chuan.controller';

@Module({
  imports: [DatabaseModule.forFeature([QuyChuan])],
  controllers: [QuyChuan_Controller],
  providers: [QuyChuan_Service],
  exports: [QuyChuan_Service],
})
export class QuyChuan_Module {}
