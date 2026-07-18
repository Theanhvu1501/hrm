import type { ServiceResponse } from '../../interfaces';
import type {
  ChungTuResponse,
  ChungTuQueryParams,
  CreateChungTuRequest,
} from '@app/dto';
import { ServiceClient } from '../../service-client';

export interface ChungTuMethods {
  getChungTu(
    params?: ChungTuQueryParams,
    authToken?: string,
  ): Promise<ServiceResponse<ChungTuResponse[]>>;

  getChungTuById(
    id: string,
    authToken?: string,
  ): Promise<ServiceResponse<ChungTuResponse>>;

  createChungTu(
    dto: CreateChungTuRequest,
    authToken?: string,
  ): Promise<ServiceResponse<ChungTuResponse>>;
}

declare module '../../service-client' {
  interface ServiceMethods extends ChungTuMethods {}
}

const SERVICE_NAME = 'voucher';

ServiceClient.prototype.getChungTu = async function (
  this: ServiceClient,
  params?: ChungTuQueryParams,
  authToken?: string,
): Promise<ServiceResponse<ChungTuResponse[]>> {
  return this.get<ChungTuResponse[]>(SERVICE_NAME, '/chung-tu', {
    headers: authToken ? { Authorization: authToken } : undefined,
    query: params as Record<string, string | undefined>,
  });
};

ServiceClient.prototype.getChungTuById = async function (
  this: ServiceClient,
  id: string,
  authToken?: string,
): Promise<ServiceResponse<ChungTuResponse>> {
  return this.get<ChungTuResponse>(SERVICE_NAME, `/chung-tu/${id}`, {
    headers: authToken ? { Authorization: authToken } : undefined,
  });
};

ServiceClient.prototype.createChungTu = async function (
  this: ServiceClient,
  dto: CreateChungTuRequest,
  authToken?: string,
): Promise<ServiceResponse<ChungTuResponse>> {
  return this.post<ChungTuResponse>(SERVICE_NAME, '/chung-tu', {
    headers: authToken ? { Authorization: authToken } : undefined,
    body: dto,
  });
};
