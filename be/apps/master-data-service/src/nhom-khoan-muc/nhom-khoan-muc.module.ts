import { Module } from '@nestjs/common';
import { NhomKhoanMuc } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NhomKhoanMucController } from './nhom-khoan-muc.controller';
import { NhomKhoanMucService } from './nhom-khoan-muc.service';

@Module({
  imports: [DatabaseModule.forFeature([NhomKhoanMuc])],
  controllers: [NhomKhoanMucController],
  providers: [NhomKhoanMucService],
  exports: [NhomKhoanMucService],
})
export class NhomKhoanMucModule {}
