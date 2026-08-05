import { Module } from '@nestjs/common';
import { CauHinhChamCong } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { CauHinhChamCong_Service } from './cau-hinh-cham-cong.service';
import { CauHinhChamCong_Controller } from './cau-hinh-cham-cong.controller';

@Module({
  imports: [DatabaseModule.forFeature([CauHinhChamCong])],
  controllers: [CauHinhChamCong_Controller],
  providers: [CauHinhChamCong_Service],
  exports: [CauHinhChamCong_Service],
})
export class CauHinhChamCong_Module {}
