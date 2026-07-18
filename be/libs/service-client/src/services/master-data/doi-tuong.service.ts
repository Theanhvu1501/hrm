import type { ServiceResponse } from '../../interfaces';
import type { DoiTuongResponse } from '@app/dto';
import { ServiceClient } from '../../service-client';

export interface DoiTuongMethods {
  getDoiTuong(
    authToken?: string,
    tenantId?: string,
  ): Promise<ServiceResponse<DoiTuongResponse[]>>;
}

declare module '../../service-client' {
  interface ServiceMethods extends DoiTuongMethods {}
}

const SERVICE_NAME = 'master-data';

/**
 * Toàn bộ danh mục đối tượng. Dùng '/doi-tuong/all' chứ KHÔNG phải '/doi-tuong'
 * — endpoint sau phân trang (mặc định 10 bản ghi) nên chỉ trả về trang đầu.
 */
ServiceClient.prototype.getDoiTuong = async function (
  this: ServiceClient,
  authToken?: string,
  tenantId?: string,
): Promise<ServiceResponse<DoiTuongResponse[]>> {
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = authToken;
  if (tenantId) headers['x-tenant-id'] = tenantId;
  return this.get<DoiTuongResponse[]>(SERVICE_NAME, '/doi-tuong/all', {
    headers: Object.keys(headers).length ? headers : undefined,
  });
};
