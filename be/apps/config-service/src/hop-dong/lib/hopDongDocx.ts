import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';

export interface HopDongDocxData {
  hopDong: {
    contractNo?: string;
    loaiHopDong?: string;
    ngayBatDau?: string;
    ngayKetThuc?: string;
    mucLuong?: number;
    phuCap?: number;
    ghiChu?: string;
    chucDanh?: string;
  };
  nhanVien: {
    hoTen?: string;
    ngaySinh?: string;
    gioiTinh?: string;
    cccd?: string;
    ngayCapCccd?: string;
    noiCapCccd?: string;
    diaChi?: string;
    soDienThoai?: string;
    chucDanh?: string;
    email?: string;
    mst?: string;
  };
  congTy: {
    tenCongTy?: string | null;
    diaChiCongTy?: string | null;
    maSoThue?: string | null;
    nguoiDaiDien?: string | null;
    chucVuNguoiDaiDien?: string | null;
    thanhPhoKy?: string | null;
  };
}

const LOAI_HOP_DONG_LABEL: Record<string, string> = {
  xac_dinh_thoi_han: 'Xác định thời hạn',
  khong_xac_dinh_thoi_han: 'Không xác định thời hạn',
  thu_viec: 'Thử việc',
  thoi_vu: 'Thời vụ',
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '....../....../..........';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '....../....../..........';
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function formatMoney(amount?: number | null): string {
  if (amount === undefined || amount === null) return '....................';
  return amount.toLocaleString('vi-VN') + ' VNĐ';
}

function orDots(val?: string | null): string {
  return val || '....................';
}

export async function renderHopDongDocx(data: HopDongDocxData): Promise<Buffer> {
  const { hopDong, nhanVien, congTy } = data;

  // Chức danh: ưu tiên snapshot trên hợp đồng, rồi mới đến chức danh hiện tại của NV
  const chucDanh = hopDong.chucDanh || nhanVien.chucDanh;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                bold: true,
                size: 26,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Độc lập - Tự do - Hạnh phúc',
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: '─────────────', size: 24 }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'HỢP ĐỒNG LAO ĐỘNG',
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Số: ${orDots(hopDong.contractNo)}`,
                italics: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: '' }),

          // Bên A - Người sử dụng lao động
          new Paragraph({
            children: [
              new TextRun({ text: 'BÊN A (NGƯỜI SỬ DỤNG LAO ĐỘNG):', bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Tên công ty: ${orDots(congTy.tenCongTy)}`, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Địa chỉ: ${orDots(congTy.diaChiCongTy)}`, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Mã số thuế: ${orDots(congTy.maSoThue)}`, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Đại diện: ${orDots(congTy.nguoiDaiDien)}`, size: 24 }),
              new TextRun({ text: `      Chức vụ: ${orDots(congTy.chucVuNguoiDaiDien)}`, size: 24 }),
            ],
          }),
          new Paragraph({ text: '' }),

          // Bên B - Người lao động
          new Paragraph({
            children: [
              new TextRun({ text: 'BÊN B (NGƯỜI LAO ĐỘNG):', bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Họ và tên: ${orDots(nhanVien.hoTen)}`, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Ngày sinh: ${formatDate(nhanVien.ngaySinh)}`, size: 24 }),
              new TextRun({ text: `      Giới tính: ${orDots(nhanVien.gioiTinh)}`, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Số CCCD/CMND: ${orDots(nhanVien.cccd)}`, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Ngày cấp: ${formatDate(nhanVien.ngayCapCccd)}`, size: 24 }),
              new TextRun({ text: `      Nơi cấp: ${orDots(nhanVien.noiCapCccd)}`, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Địa chỉ thường trú: ${orDots(nhanVien.diaChi)}`, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Số điện thoại: ${orDots(nhanVien.soDienThoai)}`, size: 24 }),
              new TextRun({ text: `      Email: ${orDots(nhanVien.email)}`, size: 24 }),
            ],
          }),
          new Paragraph({ text: '' }),

          // Nội dung hợp đồng
          new Paragraph({
            children: [
              new TextRun({
                text: 'Hai bên thỏa thuận ký kết hợp đồng lao động và cam kết thực hiện đúng các điều khoản sau:',
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: '' }),

          // ĐIỀU 1
          new Paragraph({
            children: [
              new TextRun({ text: 'ĐIỀU 1: CÔNG VIỆC VÀ ĐỊA ĐIỂM LÀM VIỆC', bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `1. Loại hợp đồng: ${LOAI_HOP_DONG_LABEL[hopDong.loaiHopDong ?? ''] ?? orDots(hopDong.loaiHopDong)}`,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `2. Chức danh/vị trí công việc: ${orDots(chucDanh)}`, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `3. Thời hạn hợp đồng: Từ ngày ${formatDate(hopDong.ngayBatDau)} đến ngày ${formatDate(hopDong.ngayKetThuc)}`,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `4. Địa điểm làm việc: ${orDots(congTy.diaChiCongTy)}`, size: 24 }),
            ],
          }),
          new Paragraph({ text: '' }),

          // ĐIỀU 2
          new Paragraph({
            children: [
              new TextRun({ text: 'ĐIỀU 2: LƯƠNG VÀ PHỤ CẤP', bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `1. Mức lương chính: ${formatMoney(hopDong.mucLuong)}`, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `2. Phụ cấp (nếu có): ${formatMoney(hopDong.phuCap)}`, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '3. Hình thức trả lương: Chuyển khoản qua tài khoản ngân hàng', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '4. Thời hạn trả lương: Ngày 05 hàng tháng', size: 24 }),
            ],
          }),
          new Paragraph({ text: '' }),

          // ĐIỀU 3
          new Paragraph({
            children: [
              new TextRun({ text: 'ĐIỀU 3: THỜI GIỜ LÀM VIỆC, NGHỈ NGƠI', bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '1. Thời giờ làm việc: 8 giờ/ngày, 48 giờ/tuần (từ thứ Hai đến thứ Bảy)', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '2. Nghỉ hàng tuần: Chủ nhật', size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '3. Được hưởng các ngày nghỉ lễ, tết theo quy định của pháp luật', size: 24 }),
            ],
          }),
          new Paragraph({ text: '' }),

          // ĐIỀU 4
          new Paragraph({
            children: [
              new TextRun({ text: 'ĐIỀU 4: BẢO HIỂM XÃ HỘI VÀ BẢO HIỂM Y TẾ', bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Người lao động được tham gia BHXH, BHYT, BHTN theo quy định của pháp luật hiện hành.',
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: '' }),

          // ĐIỀU 5
          new Paragraph({
            children: [
              new TextRun({ text: 'ĐIỀU 5: ĐIỀU KHOẢN THI HÀNH', bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Hợp đồng này có hiệu lực kể từ ngày ký. Hai bên cam kết thực hiện đúng các điều khoản đã thỏa thuận.',
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.',
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: '' }),

          // Ngày ký
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `${orDots(congTy.thanhPhoKy)}, ngày ...... tháng ...... năm ............`,
                italics: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),

          // Chữ ký
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'ĐẠI DIỆN BÊN A', bold: true, size: 24 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '(Ký tên, đóng dấu)', italics: true, size: 20 })],
                      }),
                      new Paragraph({ text: '' }),
                      new Paragraph({ text: '' }),
                      new Paragraph({ text: '' }),
                      new Paragraph({ text: '' }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: orDots(congTy.nguoiDaiDien), bold: true, size: 24 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'ĐẠI DIỆN BÊN B', bold: true, size: 24 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '(Ký và ghi rõ họ tên)', italics: true, size: 20 })],
                      }),
                      new Paragraph({ text: '' }),
                      new Paragraph({ text: '' }),
                      new Paragraph({ text: '' }),
                      new Paragraph({ text: '' }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: orDots(nhanVien.hoTen), bold: true, size: 24 })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
