import { useEffect, useState } from "react";
import { Button, message } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { KqkdHandlerProvider, useKqkdHandler, useKqkdState } from "./KqkdHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { KqkdFilter, type KqkdFilterParams } from "./components/KqkdFilter";
import { KqkdTable } from "./components/KqkdTable";
import type { KqkdReport } from "@/services/kqkdService";
import { exportReportExcel } from "@/utils/exportReportExcel";
import { buildKqkdSheets } from "./kqkdExport";

function KqkdPageInner() {
  const handler = useKqkdHandler();
  const { canExport } = usePagePermission("/bao-cao/kqkd");
  const [kqkdData] = useKqkdState("kqkdData") as [KqkdReport | null, unknown];
  const [loading] = useKqkdState("loading") as [boolean, unknown];

  useEffect(() => {
    handler.executeEvent("init", {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (params: KqkdFilterParams) => {
    handler.executeEvent("onFilterChange", params);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN");
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    const chiTieu = kqkdData?.chiTieu ?? [];
    const meta = kqkdData?.kyHienTai && kqkdData?.kyTruoc
      ? [`Kỳ hiện tại: ${formatDate(kqkdData.kyHienTai.startDate)} – ${formatDate(kqkdData.kyHienTai.endDate)}`,
         `Kỳ trước: ${formatDate(kqkdData.kyTruoc.startDate)} – ${formatDate(kqkdData.kyTruoc.endDate)}`]
      : undefined;
    const sheets = buildKqkdSheets(chiTieu, "BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH", meta);
    if (sheets.length === 0) { message.warning("Không có dữ liệu để xuất"); return; }
    setExporting(true);
    try {
      await exportReportExcel("Bao cao KQKD", sheets);
      message.success("Đã xuất Excel");
    } catch (e) {
      console.error("export excel error", e);
      message.error("Xuất Excel thất bại");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="kqkd-page space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Báo cáo kết quả hoạt động kinh doanh
        </h1>
        {canExport && (
          <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
            Xuất Excel
          </Button>
        )}
      </div>

      <KqkdFilter onFilter={handleFilter} loading={loading} />

      {kqkdData?.kyHienTai && kqkdData?.kyTruoc && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            Kỳ hiện tại: {formatDate(kqkdData.kyHienTai.startDate)} –{" "}
            {formatDate(kqkdData.kyHienTai.endDate)}
          </span>
          <span>
            Kỳ trước: {formatDate(kqkdData.kyTruoc.startDate)} –{" "}
            {formatDate(kqkdData.kyTruoc.endDate)}
          </span>
        </div>
      )}

      <KqkdTable data={kqkdData?.chiTieu ?? []} loading={loading} />
    </div>
  );
}

const KqkdPage: React.FC = () => {
  return (
    <KqkdHandlerProvider>
      <KqkdPageInner />
    </KqkdHandlerProvider>
  );
};

export default KqkdPage;
