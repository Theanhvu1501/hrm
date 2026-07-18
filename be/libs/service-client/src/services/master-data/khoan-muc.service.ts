import type { ServiceResponse } from '../../interfaces';
import type { KhoanMucResponse } from '@app/dto';
import { ServiceClient } from '../../service-client';

export interface KhoanMucMethods {
  getKhoanMuc(authToken?: string): Promise<ServiceResponse<KhoanMucResponse[]>>;
}

declare module '../../service-client' {
  interface ServiceMethods extends KhoanMucMethods {}
}

const SERVICE_NAME = 'master-data';

ServiceClient.prototype.getKhoanMuc = async function (
  this: ServiceClient,
  authToken?: string,
): Promise<ServiceResponse<KhoanMucResponse[]>> {
  return this.get<KhoanMucResponse[]>(SERVICE_NAME, '/khoan-muc', {
    headers: authToken ? { Authorization: authToken } : undefined,
  });
};
