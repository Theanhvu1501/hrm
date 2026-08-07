import type { BieuDo, NhomChiSo } from './baoCao.types';
import { MAU_CHUOI } from './mauSac';

/**
 * SỐ LIỆU MẪU cho bản demo Báo cáo nhân sự — ĐIỂM THAY THẾ DUY NHẤT khi nối
 * API thật. Giao diện (`BaoCaoNhanSuPage` và các component con) chỉ đọc kết
 * quả của `layBaoCao()`, không biết số ở đâu ra; đổi nguồn không phải sửa lại
 * một dòng JSX nào.
 *
 * Nguyên tắc bất di bất dịch: chỉ số nào hệ thống CHƯA có nguồn dữ liệu thì
 * khai `{ co: false, canGi }` — KHÔNG bịa số cho đủ ô. Xem
 * `docs/superpowers/specs/2026-08-07-hrm-p6-bao-cao-nhan-su-design.md` §2 để
 * biết vì sao 7 trong 16 chỉ số đang ở trạng thái đó.
 */

interface ThangMau {
  ky: string; // "YYYY-MM"
  nhan: string; // nhãn ngắn trên trục biểu đồ
  tongNhanSu: number; // đang làm việc, cuối kỳ
  vaoMoi: number;
  nghiViec: number;
  /** Trong số `nghiViec`, bao nhiêu người rời đi trong 6 tháng đầu. */
  nghiSom: number;
  vuotThuViec: number; // %
  hoSoDayDu: number; // %
  vangMat: number; // %
  lamThem: number; // %
  luotThangTien: number;
}

/**
 * Sáu tháng liên tiếp. Số đầu kỳ khớp nhau theo hệ thức
 * `tổng[n] = tổng[n-1] + vàoMới[n] − nghỉViệc[n]` — một bảng demo tự mâu thuẫn
 * là thứ khách hàng phát hiện ra ngay khi họ cộng nhẩm.
 */
const CHUOI_THANG: ThangMau[] = [
  { ky: '2026-02', nhan: 'T2', tongNhanSu: 131, vaoMoi: 7, nghiViec: 4, nghiSom: 2, vuotThuViec: 78.6, hoSoDayDu: 88.5, vangMat: 1.8, lamThem: 5.2, luotThangTien: 2 },
  { ky: '2026-03', nhan: 'T3', tongNhanSu: 134, vaoMoi: 6, nghiViec: 3, nghiSom: 1, vuotThuViec: 80.0, hoSoDayDu: 89.6, vangMat: 1.6, lamThem: 5.9, luotThangTien: 1 },
  { ky: '2026-04', nhan: 'T4', tongNhanSu: 135, vaoMoi: 4, nghiViec: 3, nghiSom: 1, vuotThuViec: 83.3, hoSoDayDu: 90.4, vangMat: 1.4, lamThem: 6.1, luotThangTien: 3 },
  { ky: '2026-05', nhan: 'T5', tongNhanSu: 139, vaoMoi: 8, nghiViec: 4, nghiSom: 2, vuotThuViec: 81.2, hoSoDayDu: 91.4, vangMat: 1.7, lamThem: 7.2, luotThangTien: 2 },
  { ky: '2026-06', nhan: 'T6', tongNhanSu: 138, vaoMoi: 5, nghiViec: 6, nghiSom: 3, vuotThuViec: 84.6, hoSoDayDu: 92.0, vangMat: 1.5, lamThem: 6.8, luotThangTien: 4 },
  { ky: '2026-07', nhan: 'T7', tongNhanSu: 142, vaoMoi: 10, nghiViec: 6, nghiSom: 2, vuotThuViec: 86.4, hoSoDayDu: 94.4, vangMat: 1.2, lamThem: 7.5, luotThangTien: 5 },
];

/**
 * Kỳ chọn được: bỏ tháng đầu chuỗi vì nó không có kỳ liền trước để so sánh —
 * chỉ số "Số lượng nhân sự kỳ trước" sẽ rỗng, mà đó là một trong 16 ô bắt buộc.
 */
export const DANH_SACH_KY = CHUOI_THANG.slice(1).map((t) => t.ky);

export const KY_MAC_DINH = DANH_SACH_KY[DANH_SACH_KY.length - 1];

const phanTram = (tuSo: number, mauSo: number): number =>
  mauSo === 0 ? 0 : Math.round((tuSo / mauSo) * 1000) / 10;

function bieuDoCuaNhom(): Record<string, BieuDo[]> {
  const truc = CHUOI_THANG.map((t) => t.nhan);
  const diem = (lay: (t: ThangMau) => Record<string, number>) =>
    CHUOI_THANG.map((t, i) => ({ nhan: truc[i], ...lay(t) }));

  return {
    'thu-hut': [
      {
        ma: 'vuot-thu-viec-theo-thang',
        loai: 'cot',
        tieuDe: 'Tỷ lệ vượt qua thử việc theo tháng',
        donVi: 'phan_tram',
        chuoi: [{ khoa: 'vuotThuViec', ten: 'Vượt thử việc', mau: MAU_CHUOI.slot1 }],
        duLieu: diem((t) => ({ vuotThuViec: t.vuotThuViec })),
      },
    ],
    'bien-dong': [
      {
        ma: 'tong-nhan-su-theo-thang',
        loai: 'duong',
        tieuDe: 'Tổng nhân sự cuối kỳ',
        donVi: 'nguoi',
        chuoi: [{ khoa: 'tongNhanSu', ten: 'Đang làm việc', mau: MAU_CHUOI.slot1 }],
        duLieu: diem((t) => ({ tongNhanSu: t.tongNhanSu })),
      },
      {
        // Tách khỏi biểu đồ trên thay vì gộp: cùng đơn vị "người" nhưng khác
        // thang đo cả chục lần, vẽ chung thì cột vào/ra dí sát đáy.
        ma: 'vao-ra-theo-thang',
        loai: 'cot',
        tieuDe: 'Nhân sự vào mới và nghỉ việc',
        donVi: 'nguoi',
        chuoi: [
          { khoa: 'vaoMoi', ten: 'Vào mới', mau: MAU_CHUOI.slot1 },
          { khoa: 'nghiViec', ten: 'Nghỉ việc', mau: MAU_CHUOI.slot2 },
        ],
        duLieu: diem((t) => ({ vaoMoi: t.vaoMoi, nghiViec: t.nghiViec })),
      },
    ],
    'tuan-thu': [
      {
        ma: 'vang-mat-va-ot',
        loai: 'cot',
        tieuDe: 'Tỷ lệ vắng mặt và tỷ lệ làm thêm giờ',
        donVi: 'phan_tram',
        chuoi: [
          { khoa: 'vangMat', ten: 'Vắng mặt', mau: MAU_CHUOI.slot2 },
          { khoa: 'lamThem', ten: 'Làm thêm giờ', mau: MAU_CHUOI.slot3 },
        ],
        duLieu: diem((t) => ({ vangMat: t.vangMat, lamThem: t.lamThem })),
      },
    ],
    'dao-tao': [
      {
        ma: 'thang-tien-noi-bo',
        loai: 'cot',
        tieuDe: 'Lượt bổ nhiệm / điều chuyển nội bộ',
        donVi: 'luot',
        chuoi: [{ khoa: 'luotThangTien', ten: 'Số lượt', mau: MAU_CHUOI.slot1 }],
        duLieu: diem((t) => ({ luotThangTien: t.luotThangTien })),
      },
    ],
  };
}

export interface BaoCaoNhanSu {
  ky: string;
  kyTruoc: string;
  nhom: NhomChiSo[];
  /** Đếm sẵn cho dải tóm tắt trên đầu trang. */
  soChiSoCoSoLieu: number;
  soChiSoChuaCoNguon: number;
}

/**
 * Dựng báo cáo cho một kỳ. Ném lỗi nếu kỳ không có trong `DANH_SACH_KY` —
 * trả về báo cáo rỗng sẽ ra một trang trắng trông y hệt trang đang tải.
 */
export function layBaoCao(ky: string): BaoCaoNhanSu {
  const viTri = CHUOI_THANG.findIndex((t) => t.ky === ky);
  if (viTri < 1) throw new Error(`Kỳ không hợp lệ hoặc không có kỳ liền trước: ${ky}`);

  const nay = CHUOI_THANG[viTri];
  const truoc = CHUOI_THANG[viTri - 1];
  const bieuDo = bieuDoCuaNhom();

  const nhom: NhomChiSo[] = [
    {
      ma: 'thu-hut',
      soThuTu: 1,
      ten: 'Nhóm Chỉ Số Thu Hút & Tiếp Nhận (Kiểm soát Đầu Vào)',
      moTa: 'Kiểm soát tính hiệu quả, tốc độ và chi phí của quy trình tuyển dụng và giai đoạn thử việc.',
      bieuDo: bieuDo['thu-hut'],
      chiSo: [
        {
          ma: 'time-to-fill',
          ten: 'Thời gian lấp đầy vị trí',
          tenEn: 'Time to Fill',
          yNghia:
            'Đo lường số ngày từ lúc phát sinh nhu cầu đến khi ứng viên nhận việc. Chỉ số này giúp nhận diện lãng phí chờ đợi trong khâu xét duyệt hồ sơ hoặc tổ chức phỏng vấn.',
          donVi: 'ngay',
          chieuTot: 'giam',
          nguon: { co: false, canGi: 'module Tuyển dụng — cần mốc ngày phát sinh nhu cầu tuyển' },
        },
        {
          ma: 'cost-per-hire',
          ten: 'Chi phí tuyển dụng / nhân sự mới',
          tenEn: 'Cost per Hire',
          yNghia:
            'Tổng chi phí (nền tảng, quảng cáo, thời gian sàng lọc CV) chia cho số ứng viên tuyển thành công. Hỗ trợ dự toán ngân sách nhân sự hiệu quả.',
          donVi: 'tien',
          chieuTot: 'giam',
          nguon: { co: false, canGi: 'module Tuyển dụng — cần sổ chi phí tuyển dụng theo kỳ' },
        },
        {
          ma: 'offer-acceptance',
          ten: 'Tỷ lệ chấp nhận Offer',
          tenEn: 'Offer Acceptance Rate',
          yNghia:
            'Tỷ lệ ứng viên đồng ý ký hợp đồng so với số thư mời gửi đi. Phản ánh tính cạnh tranh của chính sách phúc lợi và khả năng thương lượng lương thưởng.',
          donVi: 'phan_tram',
          chieuTot: 'tang',
          nguon: { co: false, canGi: 'module Tuyển dụng — cần theo dõi thư mời và phản hồi ứng viên' },
        },
        {
          ma: 'vuot-thu-viec',
          ten: 'Tỷ lệ vượt qua thử việc',
          yNghia:
            'Phần trăm nhân sự được ký hợp đồng lao động chính thức. Thước đo chuẩn xác nhất về chất lượng chương trình hội nhập (Onboarding) và văn hóa tổ chức.',
          donVi: 'phan_tram',
          chieuTot: 'tang',
          nguon: {
            co: true,
            giaTri: nay.vuotThuViec,
            kyTruoc: truoc.vuotThuViec,
            moTaNguon: 'employees.ngayChinhThuc / loaiHopDong',
          },
        },
      ],
    },
    {
      ma: 'bien-dong',
      soThuTu: 2,
      ten: 'Nhóm Chỉ Số Biến Động & Ổn Định (Hoạch định Nguồn Lực)',
      moTa: 'Giám sát tỷ lệ giữ chân nhân sự và dự báo các rủi ro đứt gãy hệ thống.',
      bieuDo: bieuDo['bien-dong'],
      chiSo: [
        {
          ma: 'nhan-su-hien-tai',
          ten: 'Số lượng nhân sự hiện tại',
          yNghia: 'Tổng số nhân sự đang làm việc tại thời điểm cuối kỳ báo cáo.',
          donVi: 'nguoi',
          chieuTot: 'tang',
          nguon: {
            co: true,
            giaTri: nay.tongNhanSu,
            kyTruoc: truoc.tongNhanSu,
            moTaNguon: 'employees.trangThai = dang_lam_viec',
          },
        },
        {
          ma: 'nhan-su-ky-truoc',
          ten: 'Số lượng nhân sự kỳ trước',
          yNghia: 'Tổng nhân sự cuối kỳ liền trước — mốc so sánh cho mọi chỉ số biến động của nhóm này.',
          donVi: 'nguoi',
          // Cố ý KHÔNG khai kyTruoc: bản thân ô này ĐÃ là kỳ trước, gắn thêm
          // một mốc nữa chỉ làm người đọc rối "đang so cái gì với cái gì".
          nguon: {
            co: true,
            giaTri: truoc.tongNhanSu,
            moTaNguon: 'employees + resignations.ngayLamViecCuoi',
          },
        },
        {
          ma: 'turnover',
          ten: 'Tỷ lệ nghỉ việc',
          tenEn: 'Turnover Rate',
          yNghia:
            'Cần bóc tách rõ Nghỉ việc tự nguyện (chủ động xin nghỉ) và Không tự nguyện (chấm dứt HĐ/sa thải). Chỉ số này cảnh báo các vấn đề tiềm ẩn trong nội bộ.',
          donVi: 'phan_tram',
          chieuTot: 'giam',
          nguon: {
            co: true,
            giaTri: phanTram(nay.nghiViec, nay.tongNhanSu),
            kyTruoc: phanTram(truoc.nghiViec, truoc.tongNhanSu),
            moTaNguon: 'resignations.loaiThoiViec',
          },
        },
        {
          ma: 'early-turnover',
          ten: 'Tỷ lệ nghỉ việc sớm',
          tenEn: 'Early Turnover',
          yNghia:
            'Tỷ lệ rời đi trong vòng 3 đến 6 tháng đầu tiên. Nếu tỷ lệ này cao, chứng tỏ môi trường thực tế đang sai lệch so với mô tả công việc ban đầu.',
          donVi: 'phan_tram',
          chieuTot: 'giam',
          nguon: {
            co: true,
            giaTri: phanTram(nay.nghiSom, nay.tongNhanSu),
            kyTruoc: phanTram(truoc.nghiSom, truoc.tongNhanSu),
            moTaNguon: 'employees.ngayVaoLam vs resignations.ngayLamViecCuoi',
          },
        },
        {
          ma: 'key-talent-retention',
          ten: 'Tỷ lệ giữ chân nhân sự cốt cán',
          tenEn: 'Key Talent Retention',
          yNghia:
            'Mức độ duy trì những cá nhân có năng lực vượt trội, đảm bảo tính liên tục của các vị trí trọng yếu.',
          donVi: 'phan_tram',
          chieuTot: 'tang',
          nguon: { co: false, canGi: 'cờ "nhân sự cốt cán" trong hồ sơ nhân viên' },
        },
      ],
    },
    {
      ma: 'tuan-thu',
      soThuTu: 3,
      ten: 'Nhóm Chỉ Số Tuân Thủ, Kỷ Luật & Quản Trị Rủi Ro',
      moTa: 'Bảo vệ doanh nghiệp khỏi các rủi ro pháp lý về lao động và duy trì tính kỷ luật trong vận hành.',
      bieuDo: bieuDo['tuan-thu'],
      chiSo: [
        {
          ma: 'ho-so-phap-ly',
          ten: 'Tỷ lệ hoàn thiện hồ sơ pháp lý nhân sự',
          yNghia:
            'Đảm bảo 100% nhân sự nộp đủ giấy tờ, ký HĐLĐ đúng hạn. Rất quan trọng khi có thanh tra lao động và xử lý thủ tục bảo hiểm xã hội, thuế.',
          donVi: 'phan_tram',
          chieuTot: 'tang',
          nguon: {
            co: true,
            giaTri: nay.hoSoDayDu,
            kyTruoc: truoc.hoSoDayDu,
            moTaNguon: 'employees (trường bắt buộc) + labor_contracts',
          },
        },
        {
          ma: 'absenteeism',
          ten: 'Tỷ lệ vắng mặt',
          tenEn: 'Absenteeism Rate',
          yNghia:
            'Tỷ lệ ngày nghỉ không phép hoặc ốm đột xuất. Nếu chỉ số này gia tăng, đây là dấu hiệu sớm của tình trạng quá tải hoặc bất mãn ngầm.',
          donVi: 'phan_tram',
          chieuTot: 'giam',
          nguon: {
            co: true,
            giaTri: nay.vangMat,
            kyTruoc: truoc.vangMat,
            moTaNguon: 'timesheets.soNgayNghiKhongLuong / soNgayOm',
          },
        },
        {
          ma: 'vi-pham-ky-luat',
          ten: 'Tần suất vi phạm và quyết định kỷ luật',
          yNghia:
            'Số lượng biên bản ghi nhận lỗi (như vi phạm quy định bồi thường vật chất) và quyết định xử lý. Giúp đánh giá tính thực thi của nội quy lao động.',
          donVi: 'luot',
          chieuTot: 'giam',
          nguon: { co: false, canGi: 'module Biên bản vi phạm / quyết định kỷ luật' },
        },
        {
          ma: 'overtime-rate',
          ten: 'Tỷ lệ làm thêm giờ',
          tenEn: 'Overtime Rate',
          yNghia:
            'Tổng số giờ OT / Tổng giờ tiêu chuẩn. OT liên tục cảnh báo một quy trình đang bị nghẽn (bottleneck) hoặc định biên nhân sự tính toán chưa chuẩn xác.',
          donVi: 'phan_tram',
          chieuTot: 'giam',
          nguon: {
            co: true,
            giaTri: nay.lamThem,
            kyTruoc: truoc.lamThem,
            moTaNguon: 'timesheets.soGioLamThem / soNgayCong',
          },
        },
      ],
    },
    {
      ma: 'dao-tao',
      soThuTu: 4,
      ten: 'Nhóm Chỉ Số Đào Tạo & Khai Phóng Năng Lực',
      moTa: 'Giúp định hình văn hóa học tập liên tục và giảm thiểu lãng phí chất xám nội bộ.',
      bieuDo: bieuDo['dao-tao'],
      chiSo: [
        {
          ma: 'gio-dao-tao',
          ten: 'Số giờ đào tạo trung bình / nhân viên',
          yNghia:
            'Thời lượng đầu tư để trang bị kiến thức chuyên môn hoặc chuẩn hóa SOP công việc.',
          donVi: 'gio',
          chieuTot: 'tang',
          nguon: { co: false, canGi: 'module Đào tạo — cần khoá học và điểm danh học viên' },
        },
        {
          ma: 'chi-phi-dao-tao',
          ten: 'Chi phí đào tạo nội bộ / nhân viên',
          yNghia: 'Ngân sách doanh nghiệp bỏ ra để nâng cấp chất lượng nguồn lực từ bên trong.',
          donVi: 'tien',
          nguon: { co: false, canGi: 'module Đào tạo — cần ngân sách đào tạo theo kỳ' },
        },
        {
          ma: 'internal-mobility',
          ten: 'Tỷ lệ thăng tiến nội bộ',
          tenEn: 'Internal Mobility',
          yNghia:
            'Phần trăm vị trí quản lý hoặc chuyên viên cấp cao được lấp đầy bởi nhân sự thăng cấp thay vì tuyển mới. Phản ánh rõ nét thành công của lộ trình nghề nghiệp.',
          donVi: 'phan_tram',
          chieuTot: 'tang',
          nguon: {
            co: true,
            giaTri: phanTram(nay.luotThangTien, nay.tongNhanSu),
            kyTruoc: phanTram(truoc.luotThangTien, truoc.tongNhanSu),
            moTaNguon: 'employment_histories.loaiThayDoi = bo_nhiem | dieu_chuyen',
          },
        },
      ],
    },
  ];

  const tatCa = nhom.flatMap((n) => n.chiSo);

  return {
    ky: nay.ky,
    kyTruoc: truoc.ky,
    nhom,
    soChiSoCoSoLieu: tatCa.filter((c) => c.nguon.co).length,
    soChiSoChuaCoNguon: tatCa.filter((c) => !c.nguon.co).length,
  };
}
