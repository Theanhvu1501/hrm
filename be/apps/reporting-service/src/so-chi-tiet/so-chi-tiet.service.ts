import { Injectable } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';
import {
  buildSoChiTietMulti,
  DOI_TUONG_TRONG,
  type SoChiTietReport,
  type OpeningRow,
} from './so-chi-tiet.helper';
import {
  buildDoiTuongLoaiIndex,
  makeLoaiMatcher,
} from '../shared/doi-tuong-loai.helper';

@Injectable()
export class SoChiTietService {
  constructor(private readonly serviceClient: ServiceClient) {}

  async getSoChiTiet(
    maTaiKhoanParam: string,
    maDoiTuong: string | undefined,
    startDate: Date,
    endDate: Date,
    authToken?: string,
  ): Promise<{ reports: SoChiTietReport[] }> {
    // Lấy TẤT CẢ chứng từ (cần cả phát sinh trước kỳ cho số dư đầu kỳ)
    const [vouchersRes, accountsRes, doiTuongRes, openingRes] =
      await Promise.all([
        this.serviceClient.getNhatKyChung(undefined, undefined, authToken),
        this.serviceClient.getTaiKhoan(authToken),
        this.serviceClient.getDoiTuong(authToken),
        this.serviceClient.getSoDuDauKyRaw(authToken),
      ]);

    const vouchers = vouchersRes.success ? vouchersRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];
    const doiTuongs = doiTuongRes.success ? doiTuongRes.data || [] : [];
    const opening: OpeningRow[] = openingRes.success
      ? openingRes.data?.items || []
      : [];

    // Resolve mã TK cần dựng: 'all' = mọi TK; ngược lại tách theo dấu phẩy.
    const codes =
      maTaiKhoanParam === 'all'
        ? accounts.map((a) => a.ma)
        : maTaiKhoanParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

    // Chuẩn hoá endDate về cuối ngày để bao trùm trọn ngày kết thúc.
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Đối tượng đa loại: snapshot trong chứng từ chỉ giữ loại chính → khớp
    // "Chi tiết theo" của TK phải tra danh mục đối tượng.
    const matchLoai = makeLoaiMatcher(buildDoiTuongLoaiIndex(doiTuongs));

    const reports = buildSoChiTietMulti(
      codes,
      accounts,
      vouchers,
      opening,
      maDoiTuong,
      startDate,
      end,
      matchLoai,
    );

    // Gắn thông tin đối tượng khi có lọc theo đối tượng.
    if (maDoiTuong === DOI_TUONG_TRONG) {
      for (const report of reports) {
        report.doiTuong = { ma: '', ten: 'Chưa xác định đối tượng' };
      }
    } else if (maDoiTuong) {
      const dt = doiTuongs.find((d) => d.ma === maDoiTuong);
      if (dt) {
        for (const report of reports) {
          report.doiTuong = { ma: dt.ma, ten: dt.ten };
        }
      }
    }

    return { reports };
  }
}
