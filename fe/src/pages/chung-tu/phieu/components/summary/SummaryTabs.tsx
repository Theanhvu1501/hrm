import { useEffect, useState } from "react";
import { Tabs, Table, Typography } from "antd";
import { usePhieuState, usePhieuHandler } from "../../PhieuHandlerContext";
import { formatCurrency } from "../../lib/format";
import { PhieuSummaryItem, PhieuSummaryType } from "@/services/phieuService";

const { Text } = Typography;

const SUMMARY_TABS: { type: PhieuSummaryType; label: string }[] = [
  { type: "account", label: "Tài khoản" },
  { type: "team", label: "Đội" },
  { type: "employee", label: "Nhân viên" },
  { type: "project", label: "Dự án" },
  { type: "investor", label: "Chủ đầu tư" },
  { type: "product", label: "Sản phẩm" },
  { type: "cash-flow", label: "Dòng tiền" },
  { type: "management-group", label: "Nhóm QL" },
  { type: "promotion-group", label: "Nhóm KM" },
];

const columns = [
  {
    title: "Tên / Mã",
    key: "ten",
    render: (_: unknown, row: PhieuSummaryItem) => row.ten ?? row.key,
  },
  {
    title: "Phát sinh Nợ",
    dataIndex: "phatSinhNo",
    key: "phatSinhNo",
    align: "right" as const,
    render: (v: number) => formatCurrency(v),
  },
  {
    title: "Phát sinh Có",
    dataIndex: "phatSinhCo",
    key: "phatSinhCo",
    align: "right" as const,
    render: (v: number) => formatCurrency(v),
  },
  {
    title: "Số lượng",
    dataIndex: "soLuong",
    key: "soLuong",
    align: "right" as const,
    width: 100,
    render: (v: number) => <Text>{v}</Text>,
  },
];

export function SummaryTabs() {
  const handler = usePhieuHandler();
  const [summaryData] = usePhieuState("summaryData", {} as Record<string, PhieuSummaryItem[]>);
  const [summaryLoading] = usePhieuState("summaryLoading", {} as Record<string, boolean>);
  const [loadedTypes] = usePhieuState("summaryLoadedTypes", [] as PhieuSummaryType[]);
  const [activeKey, setActiveKey] = useState<string>(SUMMARY_TABS[0].type);

  const ensureLoaded = (type: PhieuSummaryType) => {
    if (!loadedTypes.includes(type)) {
      handler.executeEvent("loadSummary", { type });
    }
  };

  useEffect(() => {
    ensureLoaded(SUMMARY_TABS[0].type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = SUMMARY_TABS.map((tab) => ({
    key: tab.type,
    label: tab.label,
    children: (
      <Table<PhieuSummaryItem>
        className="excel-table"
        columns={columns}
        dataSource={summaryData[tab.type] ?? []}
        rowKey={(r) => `${tab.type}-${r.key}`}
        loading={summaryLoading[tab.type] ?? false}
        size="middle"
        pagination={false}
        scroll={{ y: "calc(100vh - 420px)" }}
      />
    ),
  }));

  return (
    <Tabs
      activeKey={activeKey}
      onChange={(key) => {
        setActiveKey(key);
        ensureLoaded(key as PhieuSummaryType);
      }}
      items={items}
    />
  );
}
