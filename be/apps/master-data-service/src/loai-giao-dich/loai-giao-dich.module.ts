import { Module } from '@nestjs/common';
import { LoaiGiaoDich } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { LoaiGiaoDichService } from './loai-giao-dich.service';
import { LoaiGiaoDichController } from './loai-giao-dich.controller';

@Module({
  imports: [DatabaseModule.forFeature([LoaiGiaoDich])],
  controllers: [LoaiGiaoDichController],
  providers: [LoaiGiaoDichService],
  exports: [LoaiGiaoDichService],
})
export class LoaiGiaoDichModule {}
