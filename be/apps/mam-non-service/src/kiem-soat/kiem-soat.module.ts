import { Module } from '@nestjs/common';
import { DiemDanhAn, DinhMucTienAn, CongThucDinhLuong } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { KiemSoatService } from './kiem-soat.service';
import { KiemSoatController } from './kiem-soat.controller';

@Module({
  imports: [DatabaseModule.forFeature([DiemDanhAn, DinhMucTienAn, CongThucDinhLuong])],
  controllers: [KiemSoatController],
  providers: [KiemSoatService],
})
export class KiemSoatModule {}
