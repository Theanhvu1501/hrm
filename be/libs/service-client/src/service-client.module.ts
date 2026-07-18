import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServiceClient } from './service-client';
import { IdentityClient } from './identity-client';

export interface ServiceClientModuleOptions {
  isGlobal?: boolean;
}

@Global()
@Module({})
export class ServiceClientModule {
  static forRoot(options?: ServiceClientModuleOptions): DynamicModule {
    return {
      module: ServiceClientModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: ServiceClient,
          useFactory: (configService: ConfigService) => {
            return new ServiceClient(configService);
          },
          inject: [ConfigService],
        },
        {
          provide: IdentityClient,
          useFactory: (configService: ConfigService) => {
            return new IdentityClient(configService);
          },
          inject: [ConfigService],
        },
      ],
      exports: [ServiceClient, IdentityClient],
      global: options?.isGlobal ?? true,
    };
  }
}
