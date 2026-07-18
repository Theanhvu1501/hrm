import React, { useMemo, useState } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Alert,
  DatePicker,
  InputNumber,
  message,
  Popconfirm,
  Breadcrumb,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { HomeOutlined, SearchOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { KiemSoatChiPhi, TieuHaoDong } from "@/types";
import { kiemSoatService } from "@/services/kiemSoatService";
import { formatCurrency } from "@/pages/chung-tu/phieu/lib/format";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useTableColumnFilters } from "@/components/table/useTableColumnFilters";

const { RangePicker } = DatePicker;

const KiemSoatChiPhiPage: React.FC = () => {
  const { canEdit } = usePagePermission("/bep-an/kiem-soat-chi-phi");

  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [queriedRange, setQueriedRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [nguongPct, setNguongPct] = useState<number>(0);
  const [data, setData] = useState<KiemSoatChiPhi | null>(null);
  const [loading, setLoading] = useState(false);
  const [chotting, setChotting] = useState(false);
  const [daChot, setDaChot] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await kiemSoatService.getChiPhi({
        tuNgay: range?.[0]?.format("YYYY-MM-DD"),
        denNgay: range?.[1]?.format("YYYY-MM-DD"),
        nguongPct,
      });
      setData(res);
      setQueriedRange(range);
      setDaChot(false);
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Không tải được dữ liệu kiểm soát chi phí");
    } finally {
      setLoading(false);
    }
  };

  const chot = async () => {
    if (!queriedRange) return;
    setChotting(true);
    try {
      const r = await kiemSoatService.chotTieuHao({
        tuNgay: queriedRange[0]?.format("YYYY-MM-DD"),
        denNgay: queriedRange[1]?.format("YYYY-MM-DD"),
      });
      message.success(
        `Đã chốt tiêu hao: giá vốn ${formatCurrency(r.chiPhiThuc)}${
          r.soPhieuXuat ? ` (phiếu xuất ${r.soPhieuXuat})` : ""
        }`
      );
      setDaChot(true);
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Chốt tiêu hao thất bại");
    } finally {
      setChotting(false);
    }
  };

  // Lọc theo cột ở header + cố định cột. Bảng phẳng, không có dòng tổng → lọc thẳng trên dòng.
  // Các thẻ Ngân sách / Chi phí thực / Hao phí % là số của cả kỳ nên KHÔNG đổi theo bộ lọc bảng.
  const { filterable, matches, hasPinned } = useTableColumnFilters(
    "bep-an-kiem-soat-chi-phi",
  );

  const columns: ColumnsType<TieuHaoDong> = [
    filterable({ title: "Mã hàng", dataIndex: "hangHoaMa", key: "hangHoaMa", width: 140 }),
    filterable({
      title: "Tên hàng",
      dataIndex: "hangHoaTen",
      key: "hangHoaTen",
      ellipsis: true,
    }),
    filterable({ title: "ĐVT", dataIndex: "donViTinh", key: "donViTinh", width: 100 }),
    {
      title: "Số lượng tiêu hao",
      dataIndex: "soLuong",
      key: "soLuong",
      width: 160,
      align: "right" as const,
      render: (value: number) => (value ?? 0).toLocaleString("vi-VN"),
    },
  ];

  const tieuHao = useMemo(
    () =>
      (data?.tieuHao ?? []).filter((r) =>
        matches(r, (row, key) => {
          if (key === "hangHoaMa") return row.hangHoaMa;
          if (key === "hangHoaTen") return row.hangHoaTen;
          if (key === "donViTinh") return row.donViTinh;
          return undefined;
        }),
      ),
    [data, matches],
  );

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Bếp ăn" },
          { title: "Bảng kiểm soát chi phí" },
        ]}
      />

      <Card>
        <Space wrap size="middle">
          <RangePicker
            value={range}
            onChange={(vals) => setRange(vals as [Dayjs, Dayjs] | null)}
            format="DD/MM/YYYY"
          />
          <InputNumber
            value={nguongPct}
            onChange={(v) => setNguongPct(Number(v) || 0)}
            min={0}
            max={100}
            addonAfter="%"
            placeholder="Ngưỡng cảnh báo"
            style={{ width: 200 }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={load}
            loading={loading}
            disabled={!range}
          >
            Xem
          </Button>
        </Space>
      </Card>

      {data && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic
                  title="Ngân sách"
                  value={data.nganSach}
                  precision={0}
                  formatter={(value) => formatCurrency(value as number)}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic
                  title="Chi phí thực"
                  value={data.chiPhiThuc}
                  precision={0}
                  formatter={(value) => formatCurrency(value as number)}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" className={data.vuot ? "stat-card-destructive" : undefined}>
                <Statistic
                  title="Hao phí %"
                  value={data.haoPhiPct}
                  precision={2}
                  suffix="%"
                  valueStyle={data.vuot ? { color: "#ff4d4f" } : undefined}
                />
              </Card>
            </Col>
          </Row>

          {data.canhBaoDinhGiaThieu && (
            <Alert
              type="warning"
              showIcon
              message="Không đọc được phiếu nhập kho — chi phí có thể thiếu định giá"
            />
          )}
          {data.canhBaoTruncateNhap && (
            <Alert
              type="warning"
              showIcon
              message="Có >1000 phiếu nhập, đơn giá bình quân có thể chưa đầy đủ"
            />
          )}

          <Card
            title="Chi tiết tiêu hao"
            extra={
              canEdit && (
                <Popconfirm
                  title="Chốt tiêu hao?"
                  description="Sẽ ghi phiếu xuất kho + bút toán giá vốn 632/152. KHÔNG hoàn tác — tránh chốt trùng kỳ."
                  onConfirm={chot}
                  okText="Chốt"
                  cancelText="Hủy"
                >
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    loading={chotting}
                    disabled={!data || !queriedRange || chotting || daChot}
                  >
                    Chốt tiêu hao
                  </Button>
                </Popconfirm>
              )
            }
          >
            <Table
              columns={columns}
              dataSource={tieuHao}
              rowKey={(record: TieuHaoDong) => record.hangHoaMa}
              pagination={false}
              // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được → cần scroll.x.
              scroll={{ x: hasPinned ? "max-content" : undefined }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default KiemSoatChiPhiPage;
