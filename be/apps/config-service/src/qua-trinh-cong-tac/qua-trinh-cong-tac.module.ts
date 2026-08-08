import { Module } from '@nestjs/common';
import { EmploymentHistory, Employee } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { PhongBanModule } from '../phong-ban/phong-ban.module';
import { QuaTrinhCongTac_Service } from './qua-trinh-cong-tac.service';
import { QuaTrinhCongTac_Controller } from './qua-trinh-cong-tac.controller';

@Module({
  imports: [
    DatabaseModule.forFeature([EmploymentHistory, Employee]),
    PhongBanModule,
  ],
  controllers: [QuaTrinhCongTac_Controller],
  providers: [QuaTrinhCongTac_Service],
  exports: [QuaTrinhCongTac_Service],
})
export class QuaTrinhCongTac_Module {}
