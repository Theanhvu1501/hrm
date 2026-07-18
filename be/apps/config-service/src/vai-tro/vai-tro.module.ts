import { Module } from '@nestjs/common';
import { VaiTro } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { VaiTro_Service } from './vai-tro.service';
import { VaiTro_Controller } from './vai-tro.controller';

@Module({
  imports: [DatabaseModule.forFeature([VaiTro])],
  controllers: [VaiTro_Controller],
  providers: [VaiTro_Service],
  exports: [VaiTro_Service],
})
export class VaiTro_Module {}
