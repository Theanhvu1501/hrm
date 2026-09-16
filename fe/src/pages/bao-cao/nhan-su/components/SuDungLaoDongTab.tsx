import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Empty, Space, Spin, message } from "antd";
import { FileExcelOutlined, PrinterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { apiErrorMessage } from "@/config/api";
import { printHtml } from "@/utils/printHtml";
import { usePhongBanOptions } from "@/hooks/usePhongBanOptions";
import {
  baoCaoNhanSuService,
  type SuDungLaoDong,
} from "@/services/baoCaoNhanSuService";

const LOAI_HD: Record<string, string> = {
  thu_viec: "Thử việc",
  chinh_thuc: "Chính thức",
  dich_vu: "Dịch vụ",
  khong_ro: "Chưa phân loại",
};

/** Sáu tháng đầu / cuối năm — kỳ nộp theo NĐ 145/2020. */
function kyMacDinh(): [dayjs.Dayjs, dayjs.Dayjs] {
  const nay = dayjs();
  return nay.month() < 6
    ? [nay.startOf("year"), nay.month(5).endOf("month")]
    : [nay.month(6).startOf("month"), nay.endOf("year")];
}

/**
 * BÁO CÁO TÌNH HÌNH SỬ DỤNG LAO ĐỘNG (yêu cầu d48).
 *
 * Nộp 6 tháng một lần cho cơ quan quản lý lao động. Kỳ mặc định là nửa năm
 * đang diễn ra, nhưng vẫn chọn tay được — doanh nghiệp có thể phải lập lại kỳ
 * cũ khi bị yêu cầu bổ sung.
 */
export function SuDungLaoDongTab() {
  const [tu, setTu] = useState(() => kyMacDinh()[0]);
  const [den, setDen] = useState(() => kyMacDinh()[1]);
  const [duLieu, setDuLieu] = useState<SuDungLaoDong | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const { tenTheoId } = usePhongBanOptions();

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      setDuLieu(
        await baoCaoNhanSuService.suDungLaoDong(
          tu.format("YYYY-MM-DD"),
          den.format("YYYY-MM-DD"),
        ),
      );
    } catch (err) {
      message.error(apiErrorMessage(err, "Không tải được báo cáo"));
      setDuLieu(null);
    } finally {
      setDangTai(false);
    }
  }, [tu, den]);

  useEffect(() => {
    void nap();
  }, [nap]);

  const dong = duLieu
    ? [
        ["Tổng số lao động tại thời điểm báo cáo", duLieu.tongLaoDong],
        ["Trong đó: nữ", duLieu.nu],
        ["Trong đó: nam", duLieu.nam],
        ["Lao động chưa thành niên (dưới 18)", duLieu.duoiViThanhNien],
        ["Lao động cao tuổi", duLieu.caoTuoi],
        ...Object.entries(duLieu.theoLoaiHopDong).map(
          ([ma, so]) => [`Hợp đồng: ${LOAI_HD[ma] ?? ma}`, so] as [string, number],
        ),
        ...Object.entries(duLieu.theoPhongBan).map(
          ([id, so]) =>
            [
              `Bộ phận: ${id === "khong_ro" ? "Chưa xếp phòng ban" : tenTheoId(id)}`,
              so,
            ] as [string, number],
        ),
        ["Số lao động tăng trong kỳ", duLieu.tangTrongKy],
        ["Số lao động giảm trong kỳ", duLieu.giamTrongKy],
      ]
    : [];

  const xuatExcel = () => {
    if (!duLieu) return;
    const ws = XLSX.utils.json_to_sheet(
      dong.map(([chiTieu, so]) => ({ "Chỉ tiêu": chiTieu, "Số người": so })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Su dung lao dong");
    XLSX.writeFile(
      wb,
      `Bao-cao-su-dung-lao-dong-${tu.format("YYYYMMDD")}_${den.format("YYYYMMDD")}.xlsx`,
    );
  };

  const inRa = () => {
    if (!duLieu) return;
    const than = dong
      .map(
        ([chiTieu, so]) =>
          `<tr><td>${chiTieu}</td><td class="so">${so}</td></tr>`,
      )
      .join("");
    printHtml(
      `<style>
         @page { size: A4; margin: 18mm; }
         body { font-family: "Times New Roman", serif; font-size: 13px; }
         h1 { text-align: center; font-size: 16px; margin-bottom: 2px; }
         .ky { text-align: center; font-style: italic; margin-bottom: 10px; }
         table { width: 100%; border-collapse: collapse; }
         td { border: 1px solid #000; padding: 5px 8px; }
         td.so { text-align: right; width: 120px; }
         .ky-ten { margin-top: 28px; text-align: right; }
       </style>
       <h1>BÁO CÁO TÌNH HÌNH SỬ DỤNG LAO ĐỘNG</h1>
       <div class="ky">Kỳ báo cáo: ${tu.format("DD/MM/YYYY")} – ${den.format("DD/MM/YYYY")}</div>
       <table><tbody>${than}</tbody></table>
       <div class="ky-ten">
         <div><i>Ngày …… tháng …… năm ……</i></div>
         <div><b>NGƯỜI SỬ DỤNG LAO ĐỘNG</b></div>
         <div><i>(Ký, ghi rõ họ tên, đóng dấu)</i></div>
       </div>`,
      "Báo cáo tình hình sử dụng lao động",
    );
  };

  return (
    <Card>
      <Space wrap className="mb-3">
        <DatePicker
          format="DD/MM/YYYY"
          allowClear={false}
          value={tu}
          onChange={(d) => d && setTu(d)}
        />
        <span>→</span>
        <DatePicker
          format="DD/MM/YYYY"
          allowClear={false}
          value={den}
          onChange={(d) => d && setDen(d)}
        />
        <Button icon={<FileExcelOutlined />} onClick={xuatExcel} disabled={!duLieu}>
          Xuất Excel
        </Button>
        <Button icon={<PrinterOutlined />} onClick={inRa} disabled={!duLieu}>
          In
        </Button>
      </Space>

      <Spin spinning={dangTai}>
        {duLieu ? (
          <table className="w-full border-collapse text-[12px]">
            <tbody>
              {dong.map(([chiTieu, so]) => (
                <tr key={String(chiTieu)} className="border-b border-border">
                  <td className="py-1.5">{chiTieu}</td>
                  <td className="w-28 py-1.5 text-right font-medium">{so}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !dangTai && <Empty description="Chưa có số liệu cho kỳ này" />
        )}
      </Spin>
    </Card>
  );
}
