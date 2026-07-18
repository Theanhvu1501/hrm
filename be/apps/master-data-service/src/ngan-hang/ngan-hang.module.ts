import { Module } from '@nestjs/common';
import { NganHang } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { NganHangService } from './ngan-hang.service';
import { NganHangController } from './ngan-hang.controller';

@Module({
  imports: [DatabaseModule.forFeature([NganHang])],
  controllers: [NganHangController],
  providers: [NganHangService],
  exports: [NganHangService],
})
export class NganHangModule {}
