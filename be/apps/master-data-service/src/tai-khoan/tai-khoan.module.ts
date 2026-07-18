import { Module } from '@nestjs/common';
import { TaiKhoan } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TaiKhoanService } from './tai-khoan.service';
import { TaiKhoanController } from './tai-khoan.controller';

@Module({
  imports: [DatabaseModule.forFeature([TaiKhoan])],
  controllers: [TaiKhoanController],
  providers: [TaiKhoanService],
  exports: [TaiKhoanService],
})
export class TaiKhoanModule {}
