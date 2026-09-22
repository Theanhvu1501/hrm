import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Divider,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  message,
} from "antd";
import { DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import { printHtml } from "@/utils/printHtml";
import {
  bangLuongService,
  type DongLuong,
  type MauInBangLuong,
} from "@/services/bangLuongService";
import type { KhoanLuong } from "@/services/cauHinhLuongService";
import { apiErrorMessage } from "@/config/api";

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

/** Khoá localStorage — lựa chọn cột riêng của từng người dùng (fallback). */
const KHOA_LUU = "in-bang-luong:chi-tieu";

function chiTieuCoBan(khoanLuong: KhoanLuong[]): ChiTieu[] {
  return [
    { key: "maNhanVien", nhan: "Mã NV", lay: (d) => d.employeeCode ?? "" },
    { key: "hoTen", nhan: "Họ và tên", lay: (d) => d.employeeName ?? "" },
    {
      key: "congThuong",
      nhan: "Công thường",
      lay: (d) => d.congThuong ?? 0,
      canPhai: true,
    },
    {
      key: "congThuViec",
      nhan: "Công thử việc",
      lay: (d) => d.congThuViec ?? 0,
      canPhai: true,
    },
    {
      key: "congKhac",
      nhan: "Công khác",
      lay: (d) => d.congKhac ?? 0,
      canPhai: true,
    },
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
    {
      key: "bhxh",
      nhan: "Bảo hiểm",
      canPhai: true,
      lay: (d, muc) => tien(d[muc]?.bhxh),
    },
    {
      key: "thue",
      nhan: "Thuế TNCN",
      canPhai: true,
      lay: (d, muc) => tien(d[muc]?.thue),
    },
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
 * Chọn chỉ tiêu cho bản in bảng lương (yêu cầu d37: "Cho chọn các nội dung
 * trên bản in: Bản full hoặc Tạo các mẫu bản in có các chỉ tiêu muốn chọn
 * khác nhau").
 *
 * - Mẫu in lưu xuống server → cả công ty dùng chung.
 * - Lựa chọn cá nhân nhớ trong localStorage (fallback nếu chưa chọn mẫu).
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
  const [chon, setChon] = useState<string[]>(() => docLuaChonDaLuu() ?? MAU_GON);

  // Mẫu in từ server (yêu cầu d37)
  const [dsMau, setDsMau] = useState<MauInBangLuong[]>([]);
  const [mauDangChon, setMauDangChon] = useState<string | null>(null);
  const [dangTaiMau, setDangTaiMau] = useState(false);

  // Lưu mẫu mới
  const [moLuuMau, setMoLuuMau] = useState(false);
  const [tenMauMoi, setTenMauMoi] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  // Load danh sách mẫu in khi mở modal
  useEffect(() => {
    if (!open) return;
    setDangTaiMau(true);
    bangLuongService
      .dsMauIn()
      .then((ds) => {
        setDsMau(ds);
        // Nếu chưa chọn mẫu nào, mặc định chọn mẫu đầu tiên (thường là "Đầy đủ")
        if (!mauDangChon && ds.length > 0) {
          const macDinh = ds.find((m) => m.laMacDinh) ?? ds[0];
          setMauDangChon(macDinh._id);
          setChon(macDinh.cacCot);
        }
      })
      .catch((err) => message.error(apiErrorMessage(err, "Không tải được mẫu in")))
      .finally(() => setDangTaiMau(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Khi chọn mẫu khác → cập nhật danh sách cột
  const handleChonMau = (mauId: string | null) => {
    setMauDangChon(mauId);
    if (mauId) {
      const mau = dsMau.find((m) => m._id === mauId);
      if (mau) setChon(mau.cacCot);
    }
  };

  // Lưu lựa chọn hiện tại thành mẫu mới
  const handleLuuMau = async () => {
    if (!tenMauMoi.trim()) {
      message.error("Nhập tên mẫu");
      return;
    }
    if (chon.length === 0) {
      message.error("Chọn ít nhất một chỉ tiêu");
      return;
    }
    setDangLuu(true);
    try {
      const mauMoi = await bangLuongService.taoMauIn({
        tenMau: tenMauMoi.trim(),
        cacCot: chon,
      });
      setDsMau((ds) => [...ds, mauMoi]);
      setMauDangChon(mauMoi._id);
      setMoLuuMau(false);
      setTenMauMoi("");
      message.success("Đã lưu mẫu in");
    } catch (err) {
      message.error(apiErrorMessage(err, "Không lưu được mẫu in"));
    } finally {
      setDangLuu(false);
    }
  };

  // Xóa mẫu
  const handleXoaMau = async (mauId: string) => {
    try {
      await bangLuongService.xoaMauIn(mauId);
      setDsMau((ds) => ds.filter((m) => m._id !== mauId));
      if (mauDangChon === mauId) {
        setMauDangChon(null);
      }
      message.success("Đã xóa mẫu in");
    } catch (err) {
      message.error(apiErrorMessage(err, "Không xóa được mẫu in"));
    }
  };

  const inRa = () => {
    const cot = tatCa.filter((c) => chon.includes(c.key));
    if (cot.length === 0) {
      message.error("Chọn ít nhất một chỉ tiêu");
      return;
    }
    try {
      localStorage.setItem(KHOA_LUU, JSON.stringify(chon));
    } catch {
      // Không lưu được thì thôi.
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
      width={680}
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
      </Space>

      <Divider className="my-2" />

      {/* Chọn mẫu in (d37) */}
      <div className="mb-3">
        <span className="text-[12px] mr-2">Mẫu in:</span>
        <Select
          style={{ width: 200 }}
          placeholder="Chọn mẫu in"
          value={mauDangChon}
          onChange={handleChonMau}
          loading={dangTaiMau}
          allowClear
          options={dsMau.map((m) => ({
            value: m._id,
            label: m.tenMau + (m.laMacDinh ? " ★" : ""),
          }))}
        />
        <Button
          size="small"
          className="ml-2"
          icon={<SaveOutlined />}
          onClick={() => setMoLuuMau(true)}
        >
          Lưu mẫu mới
        </Button>
        {mauDangChon && !dsMau.find((m) => m._id === mauDangChon)?.laMacDinh && (
          <Popconfirm
            title="Xóa mẫu in này?"
            onConfirm={() => handleXoaMau(mauDangChon)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button size="small" className="ml-1" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        )}
      </div>

      {/* Chọn từng cột */}
      <Checkbox.Group
        value={chon}
        onChange={(v) => {
          setChon(v as string[]);
          setMauDangChon(null); // Bỏ chọn mẫu khi tick thủ công
        }}
        className="grid grid-cols-2 gap-1"
        options={tatCa.map((c) => ({ label: c.nhan, value: c.key }))}
      />

      <div className="mt-3 text-[10.5px] text-[hsl(var(--ink-2))]">
        Chọn mẫu in có sẵn hoặc tick từng chỉ tiêu rồi "Lưu mẫu mới" để cả công ty
        dùng chung.
      </div>

      {/* Modal lưu mẫu mới */}
      <Modal
        title="Lưu mẫu in mới"
        open={moLuuMau}
        onCancel={() => setMoLuuMau(false)}
        onOk={handleLuuMau}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={dangLuu}
        width={400}
      >
        <Input
          placeholder="Tên mẫu (VD: Gửi kế toán, Gửi ban GĐ...)"
          value={tenMauMoi}
          onChange={(e) => setTenMauMoi(e.target.value)}
          onPressEnter={handleLuuMau}
        />
        <div className="mt-2 text-[11px] text-[hsl(var(--ink-2))]">
          Mẫu này sẽ lưu {chon.length} chỉ tiêu đang chọn.
        </div>
      </Modal>
    </Modal>
  );
}
