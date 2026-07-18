import { Module } from '@nestjs/common';
import { KhoanMuc } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { KhoanMucService } from './khoan-muc.service';
import { KhoanMucController } from './khoan-muc.controller';

@Module({
  imports: [DatabaseModule.forFeature([KhoanMuc])],
  controllers: [KhoanMucController],
  providers: [KhoanMucService],
  exports: [KhoanMucService],
})
export class KhoanMucModule {}
