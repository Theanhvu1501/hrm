import type { ServiceResponse } from '../../interfaces';
import type { BoPhanResponse } from '@app/dto';
import { ServiceClient } from '../../service-client';

export interface BoPhanMethods {
  getBoPhan(authToken?: string): Promise<ServiceResponse<BoPhanResponse[]>>;
}

declare module '../../service-client' {
  interface ServiceMethods extends BoPhanMethods {}
}

const SERVICE_NAME = 'master-data';

ServiceClient.prototype.getBoPhan = async function (
  this: ServiceClient,
  authToken?: string,
): Promise<ServiceResponse<BoPhanResponse[]>> {
  return this.get<BoPhanResponse[]>(SERVICE_NAME, '/bo-phan', {
    headers: authToken ? { Authorization: authToken } : undefined,
  });
};
