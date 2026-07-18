import { useEffect } from "react";
import { Card, Tabs, Breadcrumb } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { PhieuHandlerProvider, usePhieuHandler, usePhieuConfig, usePhieuState } from "./PhieuHandlerContext";
import { PhieuConfig } from "./phieuConfig";
import { StatsCards } from "./components/stats/StatsCards";
import { FilterBar } from "./components/filter/FilterBar";
import { PhieuTable, usePhieuTableColumns } from "./components/table/PhieuTable";
import { PhieuFormModal } from "./components/form-modal/PhieuFormModal";
import { PhieuViewModal } from "./components/view-modal/PhieuViewModal";
import { SummaryTabs } from "./components/summary/SummaryTabs";
import { TemplateModal } from "./components/template-modal/TemplateModal";
import { ImportExcelModal } from "./import/ImportExcelModal";
import { useTableTitleConfig } from "@/components/glossary/useTableTitleConfig";

function PhieuListPageInner() {
  const handler = usePhieuHandler();
  const config = usePhieuConfig();
  const [importModalOpen, setImportModalOpen] = usePhieuState("importModalOpen", false);

  const rawColumns = usePhieuTableColumns();
  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('chungTu.phieu', rawColumns);

  useEffect(() => {
    handler.executeEvent("init", { config });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <><HomeOutlined /> Trang chủ</> },
          { title: "Chứng từ" },
          { title: config.title },
        ]}
      />

      <StatsCards />

      <Card className="shadow-sm">
        <Tabs
          defaultActiveKey="list"
          items={[
            {
              key: "list",
              label: "Danh sách",
              children: (
                <>
                  <FilterBar settingsButton={settingsButton} />
                  <PhieuTable columns={cfgColumns} />
                </>
              ),
            },
            {
              key: "summary",
              label: "Tổng hợp",
              children: <SummaryTabs />,
            },
          ]}
        />
      </Card>

      <PhieuFormModal />
      <PhieuViewModal />
      <TemplateModal />
      <ImportExcelModal
        open={!!importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={() => handler.executeEvent("refresh", {})}
        service={config.service}
      />
    </div>
  );
}

export function PhieuListPage({ config }: { config: PhieuConfig }) {
  return (
    <PhieuHandlerProvider config={config}>
      <PhieuListPageInner />
    </PhieuHandlerProvider>
  );
}
