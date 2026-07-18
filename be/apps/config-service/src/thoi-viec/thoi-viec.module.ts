import { Module } from '@nestjs/common';
import { Resignation, Employee } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { ThoiViec_Service } from './thoi-viec.service';
import { ThoiViec_Controller } from './thoi-viec.controller';

@Module({
  imports: [DatabaseModule.forFeature([Resignation, Employee])],
  controllers: [ThoiViec_Controller],
  providers: [ThoiViec_Service],
  exports: [ThoiViec_Service],
})
export class ThoiViec_Module {}
