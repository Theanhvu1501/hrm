import type { ServiceResponse } from '../../interfaces';
import type { TaiKhoanResponse } from '@app/dto';
import { ServiceClient } from '../../service-client';

export interface TaiKhoanMethods {
  getTaiKhoan(authToken?: string): Promise<ServiceResponse<TaiKhoanResponse[]>>;
  getTaiKhoanByMa(
    ma: string,
    authToken?: string,
  ): Promise<ServiceResponse<TaiKhoanResponse>>;
}

declare module '../../service-client' {
  interface ServiceMethods extends TaiKhoanMethods {}
}

const SERVICE_NAME = 'master-data';

ServiceClient.prototype.getTaiKhoan = async function (
  this: ServiceClient,
  authToken?: string,
): Promise<ServiceResponse<TaiKhoanResponse[]>> {
  return this.get<TaiKhoanResponse[]>(SERVICE_NAME, '/tai-khoan', {
    headers: authToken ? { Authorization: authToken } : undefined,
  });
};

ServiceClient.prototype.getTaiKhoanByMa = async function (
  this: ServiceClient,
  ma: string,
  authToken?: string,
): Promise<ServiceResponse<TaiKhoanResponse>> {
  return this.get<TaiKhoanResponse>(SERVICE_NAME, `/tai-khoan/${ma}`, {
    headers: authToken ? { Authorization: authToken } : undefined,
  });
};
