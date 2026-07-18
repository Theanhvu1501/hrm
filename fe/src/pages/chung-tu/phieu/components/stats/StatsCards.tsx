import { Row, Col, Card, Statistic } from "antd";
import { FileTextOutlined, DollarOutlined } from "@ant-design/icons";
import { usePhieuState, usePhieuConfig } from "../../PhieuHandlerContext";
import { formatCurrency } from "../../lib/format";

export function StatsCards() {
  const [stats] = usePhieuState("stats", { tongSo: 0, tongTien: 0 });
  const config = usePhieuConfig();

  const isThu = config.loai === "PHIEU_THU";
  const moneyColor = isThu ? "#16a34a" : "#dc2626";

  return (
    <Row gutter={16}>
      <Col xs={12} sm={12} md={8}>
        <Card className="stat-card" size="small">
          <Statistic
            title="Tổng số phiếu"
            value={stats.tongSo}
            prefix={<FileTextOutlined className="text-blue-500" />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={8}>
        <Card
          className={`stat-card ${isThu ? "stat-card-success" : "stat-card-destructive"}`}
          size="small"
        >
          <Statistic
            title="Tổng tiền"
            value={formatCurrency(stats.tongTien)}
            valueStyle={{ color: moneyColor }}
            prefix={<DollarOutlined style={{ color: moneyColor }} />}
          />
        </Card>
      </Col>
    </Row>
  );
}
