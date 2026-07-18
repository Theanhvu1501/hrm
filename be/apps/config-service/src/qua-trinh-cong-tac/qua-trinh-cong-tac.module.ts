import { Module } from '@nestjs/common';
import { EmploymentHistory, Employee } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { QuaTrinhCongTac_Service } from './qua-trinh-cong-tac.service';
import { QuaTrinhCongTac_Controller } from './qua-trinh-cong-tac.controller';

@Module({
  imports: [DatabaseModule.forFeature([EmploymentHistory, Employee])],
  controllers: [QuaTrinhCongTac_Controller],
  providers: [QuaTrinhCongTac_Service],
  exports: [QuaTrinhCongTac_Service],
})
export class QuaTrinhCongTac_Module {}
