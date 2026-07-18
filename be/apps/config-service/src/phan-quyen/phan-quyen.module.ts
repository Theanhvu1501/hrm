import { Module } from '@nestjs/common';
import { PhanQuyen } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { PhanQuyen_Service } from './phan-quyen.service';
import { PhanQuyen_Controller } from './phan-quyen.controller';

@Module({
  imports: [DatabaseModule.forFeature([PhanQuyen])],
  controllers: [PhanQuyen_Controller],
  providers: [PhanQuyen_Service],
  exports: [PhanQuyen_Service],
})
export class PhanQuyen_Module {}
