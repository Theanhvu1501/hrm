import { useEffect } from "react";
import { Tabs } from "antd";
import {
  TableOutlined,
  FilterOutlined,
  TeamOutlined,
  UserOutlined,
  ProjectOutlined,
  BankOutlined,
  ShoppingOutlined,
  DollarOutlined,
  AppstoreOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import { SummaryType } from "@/services/nhatKyChungService";
import { EntryListTab } from "./EntryListTab";
import { SummaryTab } from "./SummaryTab";
import { TeamTab } from "./TeamTab";
import { EmployeeTab } from "./EmployeeTab";
import { ProjectTab } from "./ProjectTab";
import { ChuDauTuTab } from "./ChuDauTuTab";
import { SanPhamTab } from "./SanPhamTab";
import { DongTienTab } from "./DongTienTab";
import { NhomQuanLyTab } from "./NhomQuanLyTab";
import { NhomKhuyenMaiTab } from "./NhomKhuyenMaiTab";
import "./DataTabs.state";

// Map tab key to summary type for API calls
const TAB_TO_SUMMARY_TYPE: Record<string, SummaryType> = {
  summary: "account",
  team: "team",
  employee: "employee",
  project: "project",
  chudautu: "investor",
  sanpham: "product",
  dongtien: "cash-flow",
  nhomquanly: "management-group",
  nhomkm: "promotion-group",
};

export function DataTabs() {
  const [activeTab, setActiveTab] = useNhatKyChungState("activeTab", "list");
  const handler = useNhatKyChungHandler();

  // Load summary data when switching to a summary tab
  useEffect(() => {
    const summaryType = TAB_TO_SUMMARY_TYPE[activeTab];
    if (summaryType) {
      handler.executeEvent("loadSummary", { type: summaryType });
    }
  }, [activeTab, handler]);

  return (
    <div className="excel-container">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        className="excel-tabs"
        tabBarStyle={{
          marginBottom: 0,
          borderBottom: '1px solid #d9d9d9',
          background: '#f5f5f5',
          paddingLeft: 4,
        }}
        items={[
          {
            key: "list",
            label: <span><TableOutlined /> Bút toán</span>,
            children: <EntryListTab />,
          },
          {
            key: "summary",
            label: <span><FilterOutlined /> Theo TK</span>,
            children: <SummaryTab />,
          },
          {
            key: "team",
            label: <span><TeamOutlined /> Đội</span>,
            children: <TeamTab />,
          },
          {
            key: "employee",
            label: <span><UserOutlined /> NV</span>,
            children: <EmployeeTab />,
          },
          {
            key: "project",
            label: <span><ProjectOutlined /> Dự án</span>,
            children: <ProjectTab />,
          },
          {
            key: "chudautu",
            label: <span><BankOutlined /> CĐT</span>,
            children: <ChuDauTuTab />,
          },
          {
            key: "sanpham",
            label: <span><ShoppingOutlined /> SP</span>,
            children: <SanPhamTab />,
          },
          {
            key: "dongtien",
            label: <span><DollarOutlined /> Dòng tiền</span>,
            children: <DongTienTab />,
          },
          {
            key: "nhomquanly",
            label: <span><AppstoreOutlined /> Nhóm QL</span>,
            children: <NhomQuanLyTab />,
          },
          {
            key: "nhomkm",
            label: <span><GiftOutlined /> Nhóm KM</span>,
            children: <NhomKhuyenMaiTab />,
          },
        ]}
      />
    </div>
  );
}
