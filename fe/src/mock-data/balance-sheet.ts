export interface BalanceSheetItem {
  ma: string;
  tenChiTieu: string;
  thuYetMinh?: string;
  dauNam: number;
  cuoiKy: number;
  level: number;
  isTotal?: boolean;
  isSection?: boolean;
}

export interface BalanceSheetData {
  taiSan: BalanceSheetItem[];
  nguonVon: BalanceSheetItem[];
  tongTaiSan: { dauNam: number; cuoiKy: number };
  tongNguonVon: { dauNam: number; cuoiKy: number };
  canDoi: boolean;
}

// Mock balance sheet data following Vietnamese accounting standards (Thông tư 200)
export const mockBalanceSheetData: BalanceSheetData = {
  taiSan: [
    // A. TÀI SẢN NGẮN HẠN
    { ma: 'A', tenChiTieu: 'A. TÀI SẢN NGẮN HẠN', dauNam: 2285000000, cuoiKy: 2450000000, level: 0, isSection: true },
    { ma: 'I', tenChiTieu: 'I. Tiền và các khoản tương đương tiền', dauNam: 1700000000, cuoiKy: 1850000000, level: 1, isTotal: true },
    { ma: '111', tenChiTieu: '1. Tiền', thuYetMinh: 'V.01', dauNam: 500000000, cuoiKy: 550000000, level: 2 },
    { ma: '112', tenChiTieu: '2. Các khoản tương đương tiền', thuYetMinh: 'V.01', dauNam: 1200000000, cuoiKy: 1300000000, level: 2 },
    
    { ma: 'II', tenChiTieu: 'II. Đầu tư tài chính ngắn hạn', dauNam: 0, cuoiKy: 0, level: 1, isTotal: true },
    { ma: '121', tenChiTieu: '1. Chứng khoán kinh doanh', thuYetMinh: 'V.02', dauNam: 0, cuoiKy: 0, level: 2 },
    
    { ma: 'III', tenChiTieu: 'III. Các khoản phải thu ngắn hạn', dauNam: 380000000, cuoiKy: 395000000, level: 1, isTotal: true },
    { ma: '131', tenChiTieu: '1. Phải thu ngắn hạn của khách hàng', thuYetMinh: 'V.03', dauNam: 320000000, cuoiKy: 345000000, level: 2 },
    { ma: '133', tenChiTieu: '2. Thuế GTGT được khấu trừ', thuYetMinh: 'V.04', dauNam: 45000000, cuoiKy: 35000000, level: 2 },
    { ma: '141', tenChiTieu: '3. Tạm ứng', thuYetMinh: 'V.05', dauNam: 15000000, cuoiKy: 15000000, level: 2 },
    
    { ma: 'IV', tenChiTieu: 'IV. Hàng tồn kho', dauNam: 205000000, cuoiKy: 205000000, level: 1, isTotal: true },
    { ma: '152', tenChiTieu: '1. Nguyên liệu, vật liệu', thuYetMinh: 'V.06', dauNam: 180000000, cuoiKy: 180000000, level: 2 },
    { ma: '153', tenChiTieu: '2. Công cụ, dụng cụ', thuYetMinh: 'V.06', dauNam: 25000000, cuoiKy: 25000000, level: 2 },
    
    { ma: 'V', tenChiTieu: 'V. Tài sản ngắn hạn khác', dauNam: 0, cuoiKy: 0, level: 1, isTotal: true },
    
    // B. TÀI SẢN DÀI HẠN
    { ma: 'B', tenChiTieu: 'B. TÀI SẢN DÀI HẠN', dauNam: 730000000, cuoiKy: 705000000, level: 0, isSection: true },
    { ma: 'I.B', tenChiTieu: 'I. Các khoản phải thu dài hạn', dauNam: 0, cuoiKy: 0, level: 1, isTotal: true },
    
    { ma: 'II.B', tenChiTieu: 'II. Tài sản cố định', dauNam: 730000000, cuoiKy: 705000000, level: 1, isTotal: true },
    { ma: '211', tenChiTieu: '1. Tài sản cố định hữu hình', thuYetMinh: 'V.08', dauNam: 850000000, cuoiKy: 850000000, level: 2 },
    { ma: '214', tenChiTieu: '   - Giá trị hao mòn lũy kế', thuYetMinh: 'V.08', dauNam: -120000000, cuoiKy: -145000000, level: 2 },
    
    { ma: 'III.B', tenChiTieu: 'III. Bất động sản đầu tư', dauNam: 0, cuoiKy: 0, level: 1, isTotal: true },
    { ma: 'IV.B', tenChiTieu: 'IV. Tài sản dở dang dài hạn', dauNam: 0, cuoiKy: 0, level: 1, isTotal: true },
    { ma: 'V.B', tenChiTieu: 'V. Đầu tư tài chính dài hạn', dauNam: 0, cuoiKy: 0, level: 1, isTotal: true },
    { ma: 'VI.B', tenChiTieu: 'VI. Tài sản dài hạn khác', dauNam: 0, cuoiKy: 0, level: 1, isTotal: true },
  ],
  nguonVon: [
    // C. NỢ PHẢI TRẢ
    { ma: 'C', tenChiTieu: 'C. NỢ PHẢI TRẢ', dauNam: 940000000, cuoiKy: 1030000000, level: 0, isSection: true },
    { ma: 'I.C', tenChiTieu: 'I. Nợ ngắn hạn', dauNam: 440000000, cuoiKy: 530000000, level: 1, isTotal: true },
    { ma: '331', tenChiTieu: '1. Phải trả người bán ngắn hạn', thuYetMinh: 'V.15', dauNam: 280000000, cuoiKy: 370000000, level: 2 },
    { ma: '333', tenChiTieu: '2. Thuế và các khoản phải nộp Nhà nước', thuYetMinh: 'V.16', dauNam: 65000000, cuoiKy: 65000000, level: 2 },
    { ma: '334', tenChiTieu: '3. Phải trả người lao động', thuYetMinh: 'V.17', dauNam: 95000000, cuoiKy: 95000000, level: 2 },
    
    { ma: 'II.C', tenChiTieu: 'II. Nợ dài hạn', dauNam: 500000000, cuoiKy: 500000000, level: 1, isTotal: true },
    { ma: '341', tenChiTieu: '1. Vay và nợ thuê tài chính dài hạn', thuYetMinh: 'V.20', dauNam: 500000000, cuoiKy: 500000000, level: 2 },
    
    // D. VỐN CHỦ SỞ HỮU
    { ma: 'D', tenChiTieu: 'D. VỐN CHỦ SỞ HỮU', dauNam: 2075000000, cuoiKy: 2125000000, level: 0, isSection: true },
    { ma: 'I.D', tenChiTieu: 'I. Vốn chủ sở hữu', dauNam: 2075000000, cuoiKy: 2125000000, level: 1, isTotal: true },
    { ma: '411', tenChiTieu: '1. Vốn góp của chủ sở hữu', thuYetMinh: 'V.21', dauNam: 1500000000, cuoiKy: 1500000000, level: 2 },
    { ma: '421', tenChiTieu: '2. Lợi nhuận sau thuế chưa phân phối', thuYetMinh: 'V.22', dauNam: 575000000, cuoiKy: 625000000, level: 2 },
    
    { ma: 'II.D', tenChiTieu: 'II. Nguồn kinh phí và quỹ khác', dauNam: 0, cuoiKy: 0, level: 1, isTotal: true },
  ],
  tongTaiSan: { dauNam: 3015000000, cuoiKy: 3155000000 },
  tongNguonVon: { dauNam: 3015000000, cuoiKy: 3155000000 },
  canDoi: true,
};
