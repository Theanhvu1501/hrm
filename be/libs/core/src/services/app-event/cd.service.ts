import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

@Injectable({})
export class CDService implements OnModuleInit {
  private static discorveryService?: DiscoveryService;

  constructor(private discorveryService: DiscoveryService) {}

  onModuleInit() {
    CDService.discorveryService = this.discorveryService;
  }

  static getProvider<T>(service: T) {
    const wrapper = this.discorveryService
      ?.getProviders()
      .find((s) => s.instance instanceof (service as unknown as any));
    return wrapper?.instance;
  }

  static getController(service: any) {
    const wrapper = this.discorveryService
      ?.getControllers()
      .find((s) => s.instance instanceof service);
    return wrapper?.instance;
  }
}
