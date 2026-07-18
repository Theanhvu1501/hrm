import { Injectable } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';
import { buildCongNoReport } from './cong-no-tong-hop.helper';
import {
  buildDoiTuongLoaiIndex,
  makeLoaiMatcher,
  matchLoaiBySnapshot,
  type LoaiMatcher,
} from '../shared/doi-tuong-loai.helper';
import {
  AccountInfo,
  DtAggInput,
  DtOpeningInput,
  CongNoFilters,
  BangTongHopCongNo,
} from './cong-no-tong-hop.types';

@Injectable()
export class CongNoTongHopService {
  constructor(private readonly serviceClient: ServiceClient) {}

  async getReport(
    startDate: Date,
    endDate: Date,
    filters: CongNoFilters,
    authToken?: string,
  ): Promise<BangTongHopCongNo> {
    const [dtAggRes, accountsRes, openingRawRes, doiTuongRes] = await Promise.all([
      this.serviceClient.aggregateBalanceByDoiTuong(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
      ),
      this.serviceClient.getTaiKhoan(authToken),
      this.serviceClient.getSoDuDauKyRaw(authToken),
      this.serviceClient.getDoiTuong(authToken),
    ]);

    // Đối tượng đa loại: snapshot chỉ giữ loại chính → tra danh mục để khớp
    // "Chi tiết theo" của TK.
    const matchLoai: LoaiMatcher = doiTuongRes.success
      ? makeLoaiMatcher(buildDoiTuongLoaiIndex(doiTuongRes.data || []))
      : matchLoaiBySnapshot;

    const dtAgg: DtAggInput[] = dtAggRes.success
      ? ((dtAggRes.data as unknown as DtAggInput[]) ?? [])
      : [];
    const accounts: AccountInfo[] = accountsRes.success
      ? (accountsRes.data ?? []).map((a) => ({
          ma: a.ma,
          ten: a.ten,
          loai: a.loai,
          chiTietTheo: a.chiTietTheo,
        }))
      : [];
    const openingRaw: DtOpeningInput[] =
      openingRawRes.success && openingRawRes.data
        ? ((openingRawRes.data.items as unknown as DtOpeningInput[]) ?? [])
        : [];

    return buildCongNoReport(accounts, dtAgg, openingRaw, filters, matchLoai);
  }
}
