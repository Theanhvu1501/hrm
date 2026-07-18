import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Select,
  InputNumber,
  Space,
  Typography,
  Breadcrumb,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { HomeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { taxReportService, TongHopThue } from "@/services/taxService";
import { useTableColumnFilters } from "@/components/table/useTableColumnFilters";

const { Text, Title } = Typography;

const fmt = (n?: number) => (n ?? 0).toLocaleString("vi-VN");

interface ChiTieuRow {
  key: string;
  chiTieu: string;
  giaTri?: number;
  strong?: boolean;
}

type Filterable = ReturnType<typeof useTableColumnFilters>["filterable"];

/** Ô dùng để so khớp bộ lọc cột — key trùng `key` của cột antd. */
const cellValue = (r: ChiTieuRow, key: string): string | undefined =>
  key === "chiTieu" ? r.chiTieu : undefined;

/** 2 bảng dùng chung bố cục cột, nhưng mỗi bảng có bộ lọc + cột ghim riêng. */
const buildColumns = (filterable: Filterable): ColumnsType<ChiTieuRow> => [
  filterable<ChiTieuRow>({
    title: "Chỉ tiêu",
    dataIndex: "chiTieu",
    key: "chiTieu",
    render: (v: string, r: ChiTieuRow) => (r.strong ? <Text strong>{v}</Text> : v),
  }),
  {
    title: "Số tiền",
    dataIndex: "giaTri",
    key: "giaTri",
    width: 220,
    align: "right" as const,
    render: (v: number, r: ChiTieuRow) =>
      r.strong ? <Text strong>{fmt(v)}</Text> : fmt(v),
  },
];

const QUY_OPTIONS = [
  { value: 0, label: "Cả năm" },
  { value: 1, label: "Quý 1" },
  { value: 2, label: "Quý 2" },
  { value: 3, label: "Quý 3" },
  { value: 4, label: "Quý 4" },
];

const TongHopThuePage: React.FC = () => {
  const [nam, setNam] = useState<number>(dayjs().year());
  const [quy, setQuy] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TongHopThue | null>(null);

  const fetchData = async (namArg = nam, quyArg = quy) => {
    setLoading(true);
    try {
      const res = await taxReportService.getTongHop(namArg, quyArg || undefined);
      setData(res);
    } catch {
      message.error("Không thể tải dữ liệu tổng hợp thuế");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lọc theo cột ở header + cố định cột. 2 bảng độc lập → 2 bộ lọc/ghim riêng.
  // Bảng chỉ tiêu phẳng, không có dòng tổng cộng gộp → lọc thẳng trên mảng.
  const vatFilters = useTableColumnFilters("thue-tong-hop-vat");
  const nvFilters = useTableColumnFilters("thue-tong-hop-nghia-vu");

  const vatRows: ChiTieuRow[] = [
    { key: "1", chiTieu: "Thuế GTGT đầu vào (mua vào)", giaTri: data?.vatDauVao },
    { key: "2", chiTieu: "Thuế GTGT đầu ra (bán ra)", giaTri: data?.vatDauRa },
    {
      key: "3",
      chiTieu: "Thuế GTGT phải nộp trong kỳ",
      giaTri: data?.vatPhaiNop,
      strong: true,
    },
    {
      key: "4",
      chiTieu: "Thuế GTGT còn được khấu trừ chuyển kỳ sau",
      giaTri: data?.vatConKhauTru,
    },
  ];

  const nvRows: ChiTieuRow[] = [
    { key: "1", chiTieu: "Thuế TNDN phải nộp (tạm tính)", giaTri: data?.nghiaVuNganSach.thueTNDN },
    { key: "2", chiTieu: "Thuế GTGT phải nộp", giaTri: data?.nghiaVuNganSach.vatPhaiNop },
    { key: "3", chiTieu: "Thuế TNCN phải nộp", giaTri: data?.nghiaVuNganSach.thueTNCN },
    { key: "4", chiTieu: "Bảo hiểm xã hội (3383)", giaTri: data?.nghiaVuNganSach.bhxh },
    { key: "5", chiTieu: "Bảo hiểm y tế (3384)", giaTri: data?.nghiaVuNganSach.bhyt },
    { key: "6", chiTieu: "Bảo hiểm thất nghiệp (3386)", giaTri: data?.nghiaVuNganSach.bhtn },
  ];

  const vatView = vatRows.filter((r) => vatFilters.matches(r, cellValue));
  const nvView = nvRows.filter((r) => nvFilters.matches(r, cellValue));

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Thuế" },
          { title: "Tổng hợp thuế" },
        ]}
      />

      <Card>
        <Space className="mb-4" wrap>
          <Text strong>Kỳ:</Text>
          <Select
            value={quy}
            onChange={(v) => {
              setQuy(v);
              fetchData(nam, v);
            }}
            options={QUY_OPTIONS}
            style={{ width: 120 }}
          />
          <Text strong>Năm:</Text>
          <InputNumber
            value={nam}
            onChange={(v) => {
              const y = v || dayjs().year();
              setNam(y);
              fetchData(y, quy);
            }}
            style={{ width: 110 }}
          />
          <Tag color="blue">
            {quy ? `Quý ${quy}/${nam}` : `Năm ${nam}`}
          </Tag>
        </Space>

        <Title level={5}>Thuế giá trị gia tăng</Title>
        <Table<ChiTieuRow>
          columns={buildColumns(vatFilters.filterable)}
          dataSource={vatView}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="small"
          className="mb-6"
          // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được.
          scroll={{ x: vatFilters.hasPinned ? "max-content" : undefined }}
        />

        <Title level={5}>Tổng hợp nghĩa vụ ngân sách</Title>
        <Table<ChiTieuRow>
          columns={buildColumns(nvFilters.filterable)}
          dataSource={nvView}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: nvFilters.hasPinned ? "max-content" : undefined }}
        />
      </Card>
    </div>
  );
};

export default TongHopThuePage;
