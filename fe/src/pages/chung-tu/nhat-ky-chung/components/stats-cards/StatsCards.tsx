import { Card, Row, Col, Statistic, Button, Typography } from "antd";
import {
  AuditOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DownOutlined,
  UpOutlined,
} from "@ant-design/icons";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import "./StatsCards.state";

const { Text } = Typography;

export function StatsCards() {
  const handler = useNhatKyChungHandler();
  const [stats] = useNhatKyChungState("stats", {
    tongButToan: 0,
    tongThu: 0,
    tongChi: 0,
    soDu: 0,
  });
  const [statsCollapsed, setStatsCollapsed] = useNhatKyChungState(
    "statsCollapsed",
    true
  );

  const handleToggle = () => {
    const newCollapsed = !statsCollapsed;
    setStatsCollapsed(newCollapsed);
    // Load stats when expanding for the first time
    if (!newCollapsed) {
      handler.executeEvent("loadStats", {});
    }
  };

  return (
    <Card className="shadow-sm transition-all duration-500" size="small">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={handleToggle}
      >
        <Text
          strong
          className="text-muted-foreground uppercase text-xs tracking-wider"
        >
          Thống kê tổng quan
        </Text>
        <Button
          type="text"
          size="small"
          icon={statsCollapsed ? <DownOutlined /> : <UpOutlined />}
        >
          {statsCollapsed ? "Mở rộng" : "Thu gọn"}
        </Button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          statsCollapsed
            ? "max-h-0 opacity-0 mt-0"
            : "max-h-96 opacity-100 mt-4"
        }`}
      >
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Card className="stat-card" size="small">
              <Statistic
                title="Tổng bút toán"
                value={stats?.tongButToan || 0}
                prefix={<AuditOutlined className="text-blue-500" />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card stat-card-success" size="small">
              <Statistic
                title="Tổng thu"
                value={stats?.tongThu || 0}
                prefix={<ArrowDownOutlined />}
                formatter={(value) =>
                  `${(Number(value) / 1000000).toFixed(0)}M`
                }
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card stat-card-destructive" size="small">
              <Statistic
                title="Tổng chi"
                value={stats?.tongChi || 0}
                prefix={<ArrowUpOutlined />}
                formatter={(value) =>
                  `${(Number(value) / 1000000).toFixed(0)}M`
                }
                valueStyle={{ color: "#ef4444" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card" size="small">
              <Statistic
                title="Số dư"
                value={stats?.soDu || 0}
                formatter={(value) =>
                  `${(Number(value) / 1000000).toFixed(0)}M`
                }
                valueStyle={{
                  color: (stats?.soDu || 0) >= 0 ? "#52c41a" : "#ef4444",
                }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </Card>
  );
}
