import { Injectable, BadRequestException } from '@nestjs/common';
import { AttendanceLocation } from '@app/entities';
import { phutTrongNgayVN, hhmmSangPhut } from './thoi-gian.util';

/**
 * Trần sai số GPS được cộng vào bán kính.
 *
 * Cộng sai số là công bằng với người đứng trong nhà tín hiệu yếu, nhưng
 * cộng vô hạn thì client chỉ cần khai doChinhXacMet: 99999 là luôn ở trong
 * vùng. Trần 50m giữ được cả hai.
 */
export const TRAN_SAI_SO_GPS_MET = 50;

export interface CaSnapshot {
  gioBatDau: string;
  gioKetThuc: string;
  laCaQuaDem: boolean;
  laLinhHoat: boolean;
  soPhutLinhHoat?: number;
}

export interface ViTriChamCong {
  latitude: number;
  longitude: number;
  doChinhXacMet?: number;
}

export interface TinhKetQuaInput {
  thoiDiem: Date;
  loai: 'vao' | 'ra';
  ca?: CaSnapshot | null;
  viTri?: ViTriChamCong | null;
  phuongThuc: 'gps' | 'wifi' | 'qr';
  maQr?: string;
  ipAddress?: string;
  diaDiemList: AttendanceLocation[];
  laNgayNghi: boolean;
}

export interface KetQuaChamCong {
  locationId?: string;
  locationTen?: string;
  khoangCachMet?: number;
  ngoaiVung: boolean;
  soPhutDiMuon: number;
  soPhutVeSom: number;
}

const BAN_KINH_TRAI_DAT_MET = 6371000;

/** Khoảng cách vòng cung lớn giữa hai toạ độ, đơn vị mét. */
export function khoangCachMet(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * BAN_KINH_TRAI_DAT_MET * Math.asin(Math.sqrt(a));
}

/** Id dạng chuỗi, chịu được cả entity thật lẫn object thuần trong test. */
function docId(d: any): string {
  return String(d?._id ?? d?.id ?? '');
}

/**
 * Toàn bộ luật tính của chấm công. KHÔNG đụng DB — nhận đủ dữ liệu qua
 * tham số để test được bằng bảng dữ liệu thuần.
 */
@Injectable()
export class ChamCongRules_Service {
  tinhKetQua(input: TinhKetQuaInput): KetQuaChamCong {
    const viTriKq = this.doiChieuViTri(input);
    const muonSom = this.tinhMuonSom(input);
    return { ...viTriKq, ...muonSom };
  }

  private doiChieuViTri(input: TinhKetQuaInput): {
    locationId?: string;
    locationTen?: string;
    khoangCachMet?: number;
    ngoaiVung: boolean;
  } {
    const ds = (input.diaDiemList ?? []).filter(
      (d: any) => d.isActive !== false && d.loai === input.phuongThuc,
    );

    if (input.phuongThuc === 'gps') {
      return this.doiChieuGps(input, ds);
    }

    if (input.phuongThuc === 'wifi') {
      const khop = ds.find(
        (d: any) => d.ipWifi && d.ipWifi === input.ipAddress,
      );
      return khop
        ? { locationId: docId(khop), locationTen: khop.ten, ngoaiVung: false }
        : { ngoaiVung: true };
    }

    const khop = ds.find((d: any) => d.maQr && d.maQr === input.maQr);
    return khop
      ? { locationId: docId(khop), locationTen: khop.ten, ngoaiVung: false }
      : { ngoaiVung: true };
  }

  private doiChieuGps(
    input: TinhKetQuaInput,
    ds: AttendanceLocation[],
  ): {
    locationId?: string;
    locationTen?: string;
    khoangCachMet?: number;
    ngoaiVung: boolean;
  } {
    if (!input.viTri) {
      throw new BadRequestException(
        'Thiếu toạ độ khi chấm công bằng GPS',
      );
    }

    let gan: { d: any; kc: number } | null = null;

    for (const d of ds as any[]) {
      // Không tự đoán giá trị thiếu: bán kính trống từng làm mọi vị trí
      // đều lọt (so sánh với undefined cho NaN). Thà báo lỗi để HR sửa.
      if (
        d.latitude === undefined ||
        d.latitude === null ||
        d.longitude === undefined ||
        d.longitude === null ||
        d.banKinh === undefined ||
        d.banKinh === null
      ) {
        throw new BadRequestException(
          `Địa điểm "${d.ten}" thiếu toạ độ hoặc bán kính — HR cần bổ sung trước khi chấm công`,
        );
      }

      const kc = khoangCachMet(
        input.viTri.latitude,
        input.viTri.longitude,
        d.latitude,
        d.longitude,
      );
      if (!gan || kc < gan.kc) gan = { d, kc };
    }

    if (!gan) return { ngoaiVung: true };

    const bienChoPhep =
      gan.d.banKinh +
      Math.min(input.viTri.doChinhXacMet ?? 0, TRAN_SAI_SO_GPS_MET);

    return {
      locationId: docId(gan.d),
      locationTen: gan.d.ten,
      khoangCachMet: Math.round(gan.kc),
      ngoaiVung: gan.kc > bienChoPhep,
    };
  }

  private tinhMuonSom(input: TinhKetQuaInput): {
    soPhutDiMuon: number;
    soPhutVeSom: number;
  } {
    const { ca, laNgayNghi, thoiDiem, loai } = input;

    // Không gán ca hoặc ngày nghỉ/lễ thì không có mốc để so → không đánh giá.
    if (!ca || laNgayNghi) return { soPhutDiMuon: 0, soPhutVeSom: 0 };

    const phutHienTai = phutTrongNgayVN(thoiDiem);

    if (loai === 'vao') {
      let muon = phutHienTai - hhmmSangPhut(ca.gioBatDau);
      if (ca.laLinhHoat) muon -= ca.soPhutLinhHoat ?? 0;
      return { soPhutDiMuon: Math.max(0, muon), soPhutVeSom: 0 };
    }

    let phut = phutHienTai;
    // Ca qua đêm kết thúc ở ngày lịch kế tiếp. Nếu người ta bấm ra khi vẫn
    // còn ở buổi tối cùng ngày với giờ vào, quy về trục âm để "ra lúc 23:00
    // của ca 22:00–06:00" ra đúng 7 tiếng về sớm thay vì 0.
    if (ca.laCaQuaDem && phut >= hhmmSangPhut(ca.gioBatDau)) {
      phut -= 1440;
    }

    return {
      soPhutDiMuon: 0,
      soPhutVeSom: Math.max(0, hhmmSangPhut(ca.gioKetThuc) - phut),
    };
  }
}
