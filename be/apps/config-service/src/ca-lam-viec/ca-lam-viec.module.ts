import { Module } from '@nestjs/common';
import { WorkShift } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { CaLamViec_Service } from './ca-lam-viec.service';
import { CaLamViec_Controller } from './ca-lam-viec.controller';

@Module({
  imports: [DatabaseModule.forFeature([WorkShift])],
  controllers: [CaLamViec_Controller],
  providers: [CaLamViec_Service],
  exports: [CaLamViec_Service],
})
export class CaLamViec_Module {}
