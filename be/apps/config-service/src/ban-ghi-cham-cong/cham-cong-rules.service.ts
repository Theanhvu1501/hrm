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

/**
 * Đầu vào tối thiểu của phép tính đi muộn/về sớm.
 *
 * Nhận `phutTrongNgay` (phút tính từ 00:00 giờ VN) chứ không nhận `Date`: HR
 * nhập bù chỉ có chuỗi "HH:mm", còn đường tự chấm có `Date` — quy về cùng một
 * đơn vị để hai đường dùng CHUNG một công thức, không ai chép lại.
 */
export interface MuonSomInput {
  phutTrongNgay: number;
  loai: 'vao' | 'ra';
  ca?: CaSnapshot | null;
  laNgayNghi: boolean;
}

export interface MuonSomKetQua {
  soPhutDiMuon: number;
  soPhutVeSom: number;
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
    const muonSom = this.tinhMuonSom({
      phutTrongNgay: phutTrongNgayVN(input.thoiDiem),
      loai: input.loai,
      ca: input.ca,
      laNgayNghi: input.laNgayNghi,
    });
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
      throw new BadRequestException('Thiếu toạ độ khi chấm công bằng GPS');
    }

    // Object rỗng/thiếu trường vẫn lọt qua `!input.viTri`. Khi đó
    // khoangCachMet(undefined, …) ra NaN, mà `NaN > banKinh` là false nên
    // hệ thống coi như trong vùng — ngồi nhà cũng chấm được. Bắt buộc phải
    // là số hữu hạn thì mới cho đi tiếp.
    if (
      !Number.isFinite(input.viTri.latitude) ||
      !Number.isFinite(input.viTri.longitude)
    ) {
      throw new BadRequestException(
        'Toạ độ chấm công GPS không hợp lệ — latitude và longitude phải là số',
      );
    }

    let gan: { d: any; kc: number } | null = null;
    const hong: string[] = [];

    for (const d of ds as any[]) {
      // Không tự đoán giá trị thiếu: bán kính trống từng làm mọi vị trí đều
      // lọt (so sánh với undefined cho NaN). Nhưng cũng KHÔNG ném ngay giữa
      // vòng lặp: một bản ghi rác cách 1.500 km từng làm cả công ty không
      // chấm công được. Bỏ qua địa điểm hỏng, chỉ báo lỗi nếu không còn
      // địa điểm gps hợp lệ nào.
      if (
        !Number.isFinite(d.latitude) ||
        !Number.isFinite(d.longitude) ||
        !Number.isFinite(d.banKinh)
      ) {
        // Kèm cả id lẫn tên: hai địa điểm trùng tên thì HR phải biết sửa
        // bản ghi nào.
        const mo = `[${docId(d) || 'không rõ id'}] "${d.ten}"`;
        hong.push(mo);
        console.warn(
          `[ChamCongRules] Bỏ qua địa điểm ${mo} vì thiếu toạ độ hoặc bán kính — HR cần bổ sung`,
        );
        continue;
      }

      const kc = khoangCachMet(
        input.viTri.latitude,
        input.viTri.longitude,
        d.latitude,
        d.longitude,
      );
      // Tie-break theo id để hai địa điểm cách đều nhau luôn cho cùng một
      // kết quả, không phụ thuộc thứ tự Mongo trả về.
      if (!gan || kc < gan.kc || (kc === gan.kc && docId(d) < docId(gan.d))) {
        gan = { d, kc };
      }
    }

    if (!gan) {
      if (hong.length) {
        throw new BadRequestException(
          `Không có địa điểm GPS nào hợp lệ để đối chiếu — các địa điểm sau thiếu toạ độ hoặc bán kính, HR cần sửa: ${hong.join(', ')}`,
        );
      }
      return { ngoaiVung: true };
    }

    // Sai số GPS chỉ được NỚI vùng, không được làm hẹp: doChinhXacMet âm
    // (client gửi rác) từng khiến người đứng đúng tâm bị đánh ngoài vùng.
    const doChinhXac = input.viTri.doChinhXacMet;
    const saiSo = Number.isFinite(doChinhXac)
      ? Math.min(Math.max(doChinhXac as number, 0), TRAN_SAI_SO_GPS_MET)
      : 0;
    const bienChoPhep = gan.d.banKinh + saiSo;
    const ngoaiVung = gan.kc > bienChoPhep;

    return {
      locationId: docId(gan.d),
      locationTen: gan.d.ten,
      // Làm tròn LÊN khi ngoài vùng, XUỐNG khi trong vùng: Math.round từng
      // trả "cách 100m" cho khoảng cách 100.05m với bán kính 100m, HR đọc
      // báo cáo thấy con số mâu thuẫn với kết luận. Cách này bảo đảm số
      // hiển thị luôn nằm cùng phía biên với kết luận.
      khoangCachMet: ngoaiVung ? Math.ceil(gan.kc) : Math.floor(gan.kc),
      ngoaiVung,
    };
  }

  /**
   * Đi muộn / về sớm — NGUỒN SỰ THẬT DUY NHẤT.
   *
   * Công khai để đường "HR nhập bù" gọi lại thay vì chép công thức: bản chép
   * trước đây thiếu hai nhánh qua nửa đêm nên cùng một tình huống cho hai kết
   * quả trái ngược (ca đêm vào 00:45 ra 0 phút muộn thay vì 165).
   */
  tinhMuonSom(input: MuonSomInput): MuonSomKetQua {
    const { ca, laNgayNghi, phutTrongNgay: phutHienTai, loai } = input;

    // Không gán ca hoặc ngày nghỉ/lễ thì không có mốc để so → không đánh giá.
    if (!ca || laNgayNghi) return { soPhutDiMuon: 0, soPhutVeSom: 0 };

    const phutBatDau = hhmmSangPhut(ca.gioBatDau);
    const phutKetThuc = hhmmSangPhut(ca.gioKetThuc);

    if (loai === 'vao') {
      let phutVao = phutHienTai;
      // Ca qua đêm (22:00–06:00): bấm vào lúc 00:30 là đã sang ngày lịch kế
      // tiếp, phải cộng 1440 rồi mới trừ mốc vào ca — nếu không thì
      // 30 - 1320 < 0 và Math.max kẹp về 0: càng vào muộn càng "sạch".
      if (ca.laCaQuaDem && phutVao < phutKetThuc) {
        phutVao += 1440;
      }
      let muon = phutVao - phutBatDau;
      if (ca.laLinhHoat) muon -= ca.soPhutLinhHoat ?? 0;
      return { soPhutDiMuon: Math.max(0, muon), soPhutVeSom: 0 };
    }

    let phut = phutHienTai;
    // Ca qua đêm kết thúc ở ngày lịch kế tiếp. Nếu người ta bấm ra khi vẫn
    // còn ở buổi tối cùng ngày với giờ vào, quy về trục âm để "ra lúc 23:00
    // của ca 22:00–06:00" ra đúng 7 tiếng về sớm thay vì 0.
    if (ca.laCaQuaDem && phut >= phutBatDau) {
      phut -= 1440;
    } else if (!ca.laCaQuaDem && phut < phutBatDau) {
      // Ca KHÔNG qua đêm (08:00–17:00) mà bấm ra lúc 01:00 thì người này đã
      // ở lại làm thêm qua nửa đêm, không phải về sớm 16 tiếng.
      //
      // Đánh đổi: một ca hiếm — bấm ra trước cả giờ vào ca trong cùng buổi
      // sáng (ví dụ ra lúc 06:00 của ca 08:00–17:00) — sẽ ra 0 thay vì
      // "về sớm rất nhiều". Chấp nhận: ghi nhầm 16 tiếng về sớm cho người
      // làm thêm là tai hại hơn nhiều so với bỏ sót một ca dị thường.
      phut += 1440;
    }

    return {
      soPhutDiMuon: 0,
      soPhutVeSom: Math.max(0, phutKetThuc - phut),
    };
  }
}
