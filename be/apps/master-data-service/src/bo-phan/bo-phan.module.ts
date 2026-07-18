import { Module } from '@nestjs/common';
import { BoPhan } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { BoPhanService } from './bo-phan.service';
import { BoPhanController } from './bo-phan.controller';

@Module({
  imports: [DatabaseModule.forFeature([BoPhan])],
  controllers: [BoPhanController],
  providers: [BoPhanService],
  exports: [BoPhanService],
})
export class BoPhanModule {}
