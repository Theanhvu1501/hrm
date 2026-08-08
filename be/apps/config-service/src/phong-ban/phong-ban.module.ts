import { Module } from '@nestjs/common';
import { ServiceClientModule } from '@app/service-client';
import { PhongBanController } from './phong-ban.controller';
import { PhongBanService } from './phong-ban.service';

@Module({
  imports: [
    // IdentityClient for forwarding requests to identity-service
    ServiceClientModule.forRoot(),
  ],
  controllers: [PhongBanController],
  providers: [PhongBanService],
  exports: [PhongBanService],
})
export class PhongBanModule {}
