import { Module } from '@nestjs/common';
import { CongThucDinhLuong } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { CongThucDinhLuongService } from './cong-thuc-dinh-luong.service';
import { CongThucDinhLuongController } from './cong-thuc-dinh-luong.controller';

@Module({
  imports: [DatabaseModule.forFeature([CongThucDinhLuong])],
  controllers: [CongThucDinhLuongController],
  providers: [CongThucDinhLuongService],
  exports: [CongThucDinhLuongService],
})
export class CongThucDinhLuongModule {}
