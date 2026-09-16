import { useMemo, useState } from "react";
import { Button, Checkbox, Modal, Segmented, Space, message } from "antd";
import { printHtml } from "@/utils/printHtml";
import type { DongLuong } from "@/services/bangLuongService";
import type { KhoanLuong } from "@/services/cauHinhLuongService";

interface Props {
  open: boolean;
  thang: string;
  danhSach: DongLuong[];
  khoanLuong: KhoanLuong[];
  tenCongTy: string;
  onClose: () => void;
}

/** Một chỉ tiêu in được: nhãn + cách lấy số từ một dòng lương. */
interface ChiTieu {
  key: string;
  nhan: string;
  lay: (d: DongLuong, muc: "khaiBao" | "thucTe") => string | number;
  canPhai?: boolean;
}

const tien = (v?: number) => (v ?? 0).toLocaleString("vi-VN");

/** Khoá localStorage — lựa chọn cột là tiện ích RIÊNG của từng người dùng. */
const KHOA_LUU = "in-bang-luong:chi-tieu";

function chiTieuCoBan(khoanLuong: KhoanLuong[]): ChiTieu[] {
  return [
    { key: "maNhanVien", nhan: "Mã NV", lay: (d) => d.employeeCode ?? "" },
    { key: "hoTen", nhan: "Họ và tên", lay: (d) => d.employeeName ?? "" },
    { key: "congThuong", nhan: "Công thường", lay: (d) => d.congThuong ?? 0, canPhai: true },
    { key: "congThuViec", nhan: "Công thử việc", lay: (d) => d.congThuViec ?? 0, canPhai: true },
    { key: "congKhac", nhan: "Công khác", lay: (d) => d.congKhac ?? 0, canPhai: true },
    ...khoanLuong.map((k) => ({
      key: `khoan:${k.ma}`,
      nhan: k.ten,
      canPhai: true,
      lay: (d: DongLuong, muc: "khaiBao" | "thucTe") =>
        tien(d[muc]?.giaTriTungKhoan?.[k.ma] ?? 0),
    })),
    {
      key: "tongThuNhap",
      nhan: "Tổng thu nhập",
      canPhai: true,
      lay: (d, muc) => tien(d[muc]?.tongThuNhap),
    },
    { key: "bhxh", nhan: "Bảo hiểm", canPhai: true, lay: (d, muc) => tien(d[muc]?.bhxh) },
    { key: "thue", nhan: "Thuế TNCN", canPhai: true, lay: (d, muc) => tien(d[muc]?.thue) },
    {
      key: "phiCongDoan",
      nhan: "Phí công đoàn",
      canPhai: true,
      lay: (d, muc) => tien(d[muc]?.phiCongDoan),
    },
    { key: "tamUng", nhan: "Tạm ứng", canPhai: true, lay: (d) => tien(d.tamUng) },
    {
      key: "khauTruKhac",
      nhan: "Khấu trừ khác",
      canPhai: true,
      lay: (d) => tien(d.khauTruKhac),
    },
    {
      key: "thucLinh",
      nhan: "Thực lĩnh",
      canPhai: true,
      lay: (d, muc) => tien(d[muc]?.thucLinh),
    },
  ];
}

/** Bản in gọn mặc định — đủ để ký nhận, không phơi mọi chỉ tiêu nội bộ. */
const MAU_GON = [
  "maNhanVien",
  "hoTen",
  "congThuong",
  "tongThuNhap",
  "bhxh",
  "thue",
  "tamUng",
  "thucLinh",
];

function docLuaChonDaLuu(): string[] | null {
  try {
    const raw = localStorage.getItem(KHOA_LUU);
    const ds = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(ds) ? (ds as string[]) : null;
  } catch {
    // Chế độ ẩn danh / chặn site data: bỏ qua, dùng mẫu gọn.
    return null;
  }
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Chọn chỉ tiêu cho bản in bảng lương (yêu cầu d32: "Cho chọn các nội dung
 * trên bản in: Bản full hoặc tạo các mẫu bản in có các chỉ tiêu muốn chọn
 * khác nhau").
 *
 * Lựa chọn nhớ trong localStorage của từng người: kế toán in cùng một bộ cột
 * mỗi tháng, bắt tick lại 15 ô mỗi lần là việc vô ích. Đây là tiện ích riêng
 * từng máy, không phải cấu hình công ty — nên không lưu xuống server.
 */
export function InBangLuongModal({
  open,
  thang,
  danhSach,
  khoanLuong,
  tenCongTy,
  onClose,
}: Props) {
  const tatCa = useMemo(() => chiTieuCoBan(khoanLuong), [khoanLuong]);
  const [muc, setMuc] = useState<"khaiBao" | "thucTe">("thucTe");
  const [chon, setChon] = useState<string[]>(
    () => docLuaChonDaLuu() ?? MAU_GON,
  );

  const inRa = () => {
    const cot = tatCa.filter((c) => chon.includes(c.key));
    if (cot.length === 0) {
      message.error("Chọn ít nhất một chỉ tiêu");
      return;
    }
    try {
      localStorage.setItem(KHOA_LUU, JSON.stringify(chon));
    } catch {
      // Không lưu được thì thôi — không ảnh hưởng việc in.
    }

    const dau = cot
      .map((c) => `<th${c.canPhai ? ' class="phai"' : ""}>${esc(c.nhan)}</th>`)
      .join("");
    const than = danhSach
      .map(
        (d) =>
          "<tr>" +
          cot
            .map(
              (c) =>
                `<td${c.canPhai ? ' class="phai"' : ""}>${esc(c.lay(d, muc))}</td>`,
            )
            .join("") +
          "</tr>",
      )
      .join("\n");

    const css = `
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: "Times New Roman", Times, serif; font-size: 12px; }
      h1 { text-align: center; font-size: 16px; margin: 0 0 2px; }
      .cty { text-align: center; font-weight: bold; text-transform: uppercase; }
      .ky { text-align: center; font-style: italic; margin-bottom: 8px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #000; padding: 4px 6px; }
      th { background: #eee; }
      .phai { text-align: right; }
      .ky-ten { margin-top: 24px; display: flex; justify-content: space-around; text-align: center; }
    `;

    printHtml(
      `<style>${css}</style>
       <div class="cty">${esc(tenCongTy)}</div>
       <h1>BẢNG THANH TOÁN TIỀN LƯƠNG</h1>
       <div class="ky">Kỳ lương tháng ${esc(thang)} — mức ${muc === "khaiBao" ? "khai báo" : "thực tế"}</div>
       <table><thead><tr>${dau}</tr></thead><tbody>${than}</tbody></table>
       <div class="ky-ten">
         <div><b>NGƯỜI LẬP BIỂU</b><br/>(Ký, họ tên)</div>
         <div><b>KẾ TOÁN TRƯỞNG</b><br/>(Ký, họ tên)</div>
         <div><b>GIÁM ĐỐC</b><br/>(Ký, họ tên, đóng dấu)</div>
       </div>`,
      `Bảng lương ${thang}`,
    );
    onClose();
  };

  return (
    <Modal
      title={`In bảng lương tháng ${thang}`}
      open={open}
      onCancel={onClose}
      onOk={inRa}
      okText="In"
      cancelText="Đóng"
      width={640}
    >
      <Space className="mb-3" wrap>
        <span className="text-[12px]">Mức in:</span>
        <Segmented
          value={muc}
          onChange={(v) => setMuc(v as "khaiBao" | "thucTe")}
          options={[
            { label: "Thực tế", value: "thucTe" },
            { label: "Khai báo", value: "khaiBao" },
          ]}
        />
        <Button size="small" onClick={() => setChon(tatCa.map((c) => c.key))}>
          Bản đầy đủ
        </Button>
        <Button size="small" onClick={() => setChon(MAU_GON)}>
          Bản gọn
        </Button>
      </Space>

      <Checkbox.Group
        value={chon}
        onChange={(v) => setChon(v as string[])}
        className="grid grid-cols-2 gap-1"
        options={tatCa.map((c) => ({ label: c.nhan, value: c.key }))}
      />

      <div className="mt-3 text-[10.5px] text-[hsl(var(--ink-2))]">
        Lựa chọn chỉ tiêu được nhớ trên máy này cho lần in sau.
      </div>
    </Modal>
  );
}
