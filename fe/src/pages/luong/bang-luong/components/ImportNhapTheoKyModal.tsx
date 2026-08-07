import { useState } from "react";
import { Alert, Button, Modal, Table, Upload, message } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { apiErrorMessage } from "@/config/api";
import { bangLuongService, type DongLuong } from "@/services/bangLuongService";
import type { KhoanLuong } from "@/services/cauHinhLuongService";
import { docLuoiImport, type DongImport } from "../lib/docFileImport";

interface Props {
  open: boolean;
  thang: string;
  /** Dòng lương của kỳ — để đối chiếu tên và giá trị CŨ trước khi ghi. */
  danhSach: DongLuong[];
  khoanLuong: KhoanLuong[];
  onClose: () => void;
  onXong: () => void;
}

/**
 * Import số nhập tay theo kỳ (hiệu suất, thưởng…) từ file Excel.
 *
 * Bắt buộc đi qua bước XEM TRƯỚC: bảng lương là tiền thật, ghi thẳng từ file
 * rồi mới báo lỗi thì không ai biết dòng nào đã vào. Màn này hiện giá trị cũ
 * → mới cho từng người trước khi bấm ghi.
 */
export function ImportNhapTheoKyModal({
  open,
  thang,
  danhSach,
  khoanLuong,
  onClose,
  onXong,
}: Props) {
  const [dong, setDong] = useState<DongImport[]>([]);
  const [loiFile, setLoiFile] = useState<string[]>([]);
  const [dangGhi, setDangGhi] = useState(false);

  // Chỉ khoản NHAP_THEO_KY mới nhận số nhập tay — backend cũng chặn, đây là
  // để file mẫu và việc khớp cột không bao giờ đề nghị sai khoản.
  const khoanNhapTay = khoanLuong.filter(
    (k) => k.loaiCongThuc === "NHAP_THEO_KY",
  );

  const theoMa = new Map(
    danhSach.map((d) => [String(d.employeeCode ?? "").trim().toLowerCase(), d]),
  );

  const dongLai = () => {
    setDong([]);
    setLoiFile([]);
    onClose();
  };

  const taiFileMau = () => {
    // File mẫu xuất sẵn danh sách nhân viên CỦA KỲ kèm giá trị hiện tại: HR
    // chỉ việc sửa số, không phải tự gõ mã — gõ tay mã là nguồn sai chính.
    const tieuDe = ["Mã NV", "Họ tên", ...khoanNhapTay.map((k) => k.ten)];
    const hang = danhSach.map((d) => [
      d.employeeCode ?? "",
      d.employeeName ?? "",
      ...khoanNhapTay.map((k) => d.nhapTheoKy?.[k.ma] ?? ""),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([tieuDe, ...hang]);
    ws["!cols"] = tieuDe.map((_, i) => ({ wch: i === 1 ? 28 : 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nhap theo ky");
    XLSX.writeFile(wb, `Mau-nhap-theo-ky-${thang}.xlsx`);
  };

  const chonFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // `header: 1` cho lưới thô — tự khớp tiêu đề ở `docLuoiImport` thay vì
      // để thư viện đoán tên trường.
      const luoi = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        blankrows: false,
      });

      const kq = docLuoiImport(luoi, khoanNhapTay);
      setDong(kq.dong);
      setLoiFile(kq.loi);
    } catch (err) {
      console.error("Đọc file import lỗi:", err);
      setDong([]);
      setLoiFile(["Không đọc được file. Kiểm tra lại định dạng .xlsx / .xls."]);
    }
    // Trả false để antd KHÔNG tự upload lên server — file chỉ đọc ở trình duyệt.
    return false;
  };

  const ghi = async () => {
    setDangGhi(true);
    try {
      const kq = await bangLuongService.importNhapTheoKy(
        thang,
        dong.map((d) => ({ maNhanVien: d.maNhanVien, giaTri: d.giaTri })),
      );

      if (kq.loi.length > 0) {
        // Không nuốt: dòng hỏng phải hiện ra, kèm mã nhân viên để tìm được.
        setLoiFile(kq.loi.map((l) => `${l.maNhanVien}: ${l.lyDo}`));
        message.warning(
          `Đã ghi ${kq.soDongGhi} dòng, ${kq.loi.length} dòng lỗi — xem chi tiết bên dưới.`,
        );
      } else {
        message.success(`Đã import ${kq.soDongGhi} dòng`);
        dongLai();
      }
      onXong();
    } catch (err) {
      message.error(apiErrorMessage(err, "Import thất bại"));
    } finally {
      setDangGhi(false);
    }
  };

  const cot = [
    { title: "Mã NV", dataIndex: "maNhanVien", width: 110 },
    {
      title: "Nhân viên",
      key: "ten",
      render: (_: unknown, r: DongImport) => {
        const co = theoMa.get(r.maNhanVien.trim().toLowerCase());
        // Mã không có trong kỳ thì backend sẽ từ chối — báo ngay ở bước xem
        // trước để HR sửa file, thay vì bấm ghi rồi mới biết.
        return co ? (
          co.employeeName
        ) : (
          <span className="text-red-500">Không có trong kỳ này</span>
        );
      },
    },
    ...khoanNhapTay.map((k) => ({
      title: k.ten,
      key: k.ma,
      align: "right" as const,
      render: (_: unknown, r: DongImport) => {
        if (!(k.ma in r.giaTri)) return <span className="text-muted-foreground">—</span>;
        const co = theoMa.get(r.maNhanVien.trim().toLowerCase());
        const cu = co?.nhapTheoKy?.[k.ma];
        const moi = r.giaTri[k.ma];
        return (
          <span>
            {cu !== undefined && cu !== moi && (
              <span className="text-muted-foreground line-through mr-1">
                {cu.toLocaleString("vi-VN")}
              </span>
            )}
            <strong>{moi.toLocaleString("vi-VN")}</strong>
          </span>
        );
      },
    })),
  ];

  return (
    <Modal
      title={`Import số nhập tay — kỳ ${thang}`}
      open={open}
      onCancel={dongLai}
      width={860}
      destroyOnClose
      footer={[
        <Button key="mau" icon={<DownloadOutlined />} onClick={taiFileMau}>
          Tải file mẫu
        </Button>,
        <Button key="huy" onClick={dongLai}>
          Huỷ
        </Button>,
        <Button
          key="ghi"
          type="primary"
          loading={dangGhi}
          disabled={dong.length === 0}
          onClick={ghi}
        >
          Ghi {dong.length > 0 ? `${dong.length} dòng` : ""}
        </Button>,
      ]}
    >
      <div className="space-y-3">
        {khoanNhapTay.length === 0 ? (
          <Alert
            type="warning"
            showIcon
            message="Công ty chưa khai khoản nào loại “Nhập tay theo kỳ”"
            description="Vào Lương → Cấu hình lương thêm khoản (vd Hiệu suất, Thưởng) rồi quay lại."
          />
        ) : (
          <>
            <Upload beforeUpload={chonFile} maxCount={1} accept=".xlsx,.xls">
              <Button icon={<UploadOutlined />}>Chọn file Excel</Button>
            </Upload>

            {loiFile.length > 0 && (
              <Alert
                type="error"
                showIcon
                message="Có dòng không import được"
                description={
                  <ul className="m-0 list-disc pl-4">
                    {loiFile.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                }
              />
            )}

            {dong.length > 0 && (
              <Table<DongImport>
                size="small"
                rowKey="maNhanVien"
                columns={cot}
                dataSource={dong}
                pagination={false}
                scroll={{ y: 320 }}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
