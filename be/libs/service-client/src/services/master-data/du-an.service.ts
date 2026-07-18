import type { ServiceResponse } from '../../interfaces';
import type { DuAnResponse } from '@app/dto';
import { ServiceClient } from '../../service-client';

export interface DuAnMethods {
  getDuAn(authToken?: string): Promise<ServiceResponse<DuAnResponse[]>>;
}

declare module '../../service-client' {
  interface ServiceMethods extends DuAnMethods {}
}

const SERVICE_NAME = 'master-data';

ServiceClient.prototype.getDuAn = async function (
  this: ServiceClient,
  authToken?: string,
): Promise<ServiceResponse<DuAnResponse[]>> {
  return this.get<DuAnResponse[]>(SERVICE_NAME, '/du-an', {
    headers: authToken ? { Authorization: authToken } : undefined,
  });
};
