import { Module } from '@nestjs/common';
import { NhomKhuyenMai } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NhomKhuyenMaiService } from './nhom-khuyen-mai.service';
import { NhomKhuyenMaiController } from './nhom-khuyen-mai.controller';

@Module({
  imports: [DatabaseModule.forFeature([NhomKhuyenMai])],
  controllers: [NhomKhuyenMaiController],
  providers: [NhomKhuyenMaiService],
  exports: [NhomKhuyenMaiService],
})
export class NhomKhuyenMaiModule {}
