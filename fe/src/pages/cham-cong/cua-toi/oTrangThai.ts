import {
  AttendanceRecord,
  TrangThaiHomNay,
} from '@/services/attendanceRecordService';
import { gioVN } from '@/ultils/thoiGianVN';

/**
 * Một ô trong hàng ba ô trên màn hình chấm công.
 *
 * Tách khỏi component để test được bằng bảng: ba ô này là thứ người dùng
 * nhìn đầu tiên và tin ngay, nên các tổ hợp (chưa chấm / mới vào / đủ / vào
 * muộn / về sớm / nhiều lượt) phải được khoá bằng test chứ không bằng việc
 * mở trình duyệt ra thử.
 */
export interface OTrangThai {
  nhan: string;
  giaTri: string;
  ghiChu: string;
  /** true = việc đã xong (ô xanh), false = chưa (ô đỏ). */
  xanh: boolean;
}

const CHUA_CHAM = '--:--';

/**
 * Lượt vào ĐẦU TIÊN và lượt ra CUỐI CÙNG là biên thật của một ngày công.
 * Chấm nhầm rồi chấm lại, hoặc ra ngoài giữa ca rồi vào lại, đều đẻ ra
 * nhiều lượt; lấy nhầm đầu-cuối sẽ hiện giờ vào muộn hơn giờ ra.
 *
 * `banGhi` do backend trả đã sắp theo `thoiDiem` tăng dần
 * (BanGhiChamCong_Service.homNay), nên find/findLast là đủ.
 */
function luotVao(banGhi: AttendanceRecord[]): AttendanceRecord | undefined {
  return banGhi.find((b) => b.loai === 'vao');
}

function luotRa(banGhi: AttendanceRecord[]): AttendanceRecord | undefined {
  for (let i = banGhi.length - 1; i >= 0; i -= 1) {
    if (banGhi[i].loai === 'ra') return banGhi[i];
  }
  return undefined;
}

function oGio(
  nhan: string,
  ban?: AttendanceRecord,
  soPhutLech = 0,
  cauLech = ''
): OTrangThai {
  if (!ban) {
    return { nhan, giaTri: CHUA_CHAM, ghiChu: 'Chưa chấm', xanh: false };
  }
  return {
    nhan,
    giaTri: gioVN(ban.thoiDiem),
    ghiChu: soPhutLech > 0 ? `${cauLech} ${soPhutLech} phút` : 'Đúng giờ',
    xanh: true,
  };
}

function oCong(soCong: number | null): OTrangThai {
  // `null` là "đã vào, đang chờ ra" — cố ý KHÔNG hiện 0, vì 0 đọc như
  // "hôm nay bạn không có công" ngay sau khi người ta vừa bấm chấm vào.
  if (soCong === null) {
    return { nhan: 'Công', giaTri: '—', ghiChu: 'Chờ ra', xanh: false };
  }
  if (soCong > 0) {
    return { nhan: 'Công', giaTri: String(soCong), ghiChu: 'Đủ công', xanh: true };
  }
  return { nhan: 'Công', giaTri: '0', ghiChu: 'Chưa tính', xanh: false };
}

export function baOTrangThai(
  homNay: TrangThaiHomNay
): [OTrangThai, OTrangThai, OTrangThai] {
  const vao = luotVao(homNay.banGhi);
  const ra = luotRa(homNay.banGhi);

  return [
    oGio('Giờ vào', vao, vao?.soPhutDiMuon ?? 0, 'Muộn'),
    oGio('Giờ ra', ra, ra?.soPhutVeSom ?? 0, 'Sớm'),
    oCong(homNay.soCong),
  ];
}
