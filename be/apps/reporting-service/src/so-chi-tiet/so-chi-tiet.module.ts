import { Module } from '@nestjs/common';
import { ServiceClientModule } from '@app/service-client';
import { SoChiTietController } from './so-chi-tiet.controller';
import { SoChiTietService } from './so-chi-tiet.service';

@Module({
  imports: [ServiceClientModule.forRoot()],
  controllers: [SoChiTietController],
  providers: [SoChiTietService],
})
export class SoChiTietModule {}
