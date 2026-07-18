import { ChungTuChiTiet, TaiKhoanItem } from "./form-handler/sub-handler/init/init.state";

export type FieldRuleLevel = "BAT_BUOC" | "CANH_BAO";

export interface FieldRuleViolation {
  lineIndex: number;
  field: string;
  fieldLabel: string;
  level: FieldRuleLevel;
  taiKhoanMa: string;
}

export const FIELD_RULE_LABELS: Record<string, string> = {
  doiTuong: "Đối tượng",
  duAn: "Dự án",
  boPhan: "Bộ phận",
  doi: "Đội thi công",
  nhanVien: "Nhân viên",
  sanPham: "Sản phẩm",
  dongTien: "Dòng tiền",
  khoanMuc: "Khoản mục",
  soTaiKhoanNganHang: "Số tài khoản ngân hàng",
};

// Đọc số tài khoản ngân hàng từ snapshot đối tượng (nếu đối tượng là TK ngân hàng/quỹ).
const snapshotSoTaiKhoan = (snapshot?: Record<string, unknown>): string => {
  const v = snapshot?.soTaiKhoan;
  return typeof v === "string" ? v.trim() : "";
};

// Trường cấp dòng (không phải doiTuong) → field id tương ứng trên ChungTuChiTiet
const FIELD_TO_LINE_KEY: Record<string, keyof ChungTuChiTiet> = {
  duAn: "duAnId",
  boPhan: "boPhanId",
  doi: "doiId",
  nhanVien: "nhanVienId",
  sanPham: "sanPhamId",
  dongTien: "dongTienId",
  khoanMuc: "khoanMucId",
};

const heavier = (a?: FieldRuleLevel, b?: FieldRuleLevel): FieldRuleLevel | undefined =>
  a === "BAT_BUOC" || b === "BAT_BUOC" ? "BAT_BUOC" : a ?? b;

/**
 * Kiểm tra fieldRules của TK Nợ + TK Có trên từng dòng hạch toán.
 * - doiTuong: TK Nợ kiểm doiTuongId, TK Có kiểm doiTuong2Id (rule riêng từng bên).
 * - Trường còn lại là cấp dòng → mức = max(rule TK Nợ, rule TK Có).
 */
export function validateFieldRules(
  chiTietList: ChungTuChiTiet[],
  taiKhoanList: TaiKhoanItem[],
): FieldRuleViolation[] {
  const violations: FieldRuleViolation[] = [];
  const byMa = new Map(taiKhoanList.map((tk) => [tk.ma, tk]));

  chiTietList.forEach((line, lineIndex) => {
    const tkNo = byMa.get(line.taiKhoanNo);
    const tkCo = byMa.get(line.taiKhoanCo);

    // doiTuong theo từng bên
    const checkDoiTuong = (tk: TaiKhoanItem | undefined, filled: boolean) => {
      const level = tk?.fieldRules?.doiTuong;
      if (tk && level && !filled) {
        violations.push({
          lineIndex,
          field: "doiTuong",
          fieldLabel: FIELD_RULE_LABELS.doiTuong,
          level: level as FieldRuleLevel,
          taiKhoanMa: tk.ma,
        });
      }
    };
    checkDoiTuong(tkNo, Boolean(line.doiTuongId));
    checkDoiTuong(tkCo, Boolean(line.doiTuong2Id));

    // Số tài khoản ngân hàng theo từng bên: đối tượng của dòng phải là TK ngân hàng có số TK
    const checkSoTaiKhoanNganHang = (
      tk: TaiKhoanItem | undefined,
      snapshot?: Record<string, unknown>,
    ) => {
      const level = tk?.fieldRules?.soTaiKhoanNganHang;
      if (tk && level && !snapshotSoTaiKhoan(snapshot)) {
        violations.push({
          lineIndex,
          field: "soTaiKhoanNganHang",
          fieldLabel: FIELD_RULE_LABELS.soTaiKhoanNganHang,
          level: level as FieldRuleLevel,
          taiKhoanMa: tk.ma,
        });
      }
    };
    checkSoTaiKhoanNganHang(tkNo, line.doiTuongSnapshot);
    checkSoTaiKhoanNganHang(tkCo, line.doiTuong2Snapshot);

    // Trường cấp dòng: gộp mức 2 TK
    for (const [field, lineKey] of Object.entries(FIELD_TO_LINE_KEY)) {
      const level = heavier(
        tkNo?.fieldRules?.[field] as FieldRuleLevel | undefined,
        tkCo?.fieldRules?.[field] as FieldRuleLevel | undefined,
      );
      if (!level || line[lineKey]) continue;
      const sourceTk =
        (tkNo?.fieldRules?.[field] as FieldRuleLevel | undefined) === level ? tkNo : tkCo;
      violations.push({
        lineIndex,
        field,
        fieldLabel: FIELD_RULE_LABELS[field] ?? field,
        level,
        taiKhoanMa: sourceTk?.ma ?? "",
      });
    }
  });

  return violations;
}

export function formatViolation(v: FieldRuleViolation): string {
  const yeuCau = v.level === "BAT_BUOC" ? "yêu cầu bắt buộc nhập" : "khuyến nghị nhập";
  return `Dòng ${v.lineIndex + 1}: TK ${v.taiKhoanMa} ${yeuCau} ${v.fieldLabel}`;
}
