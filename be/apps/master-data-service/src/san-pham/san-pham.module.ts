import { Module } from '@nestjs/common';
import { SanPham } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { SanPhamService } from './san-pham.service';
import { SanPhamController } from './san-pham.controller';

@Module({
  imports: [DatabaseModule.forFeature([SanPham])],
  controllers: [SanPhamController],
  providers: [SanPhamService],
  exports: [SanPhamService],
})
export class SanPhamModule {}
