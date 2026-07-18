import { Breadcrumb, Typography } from "antd";
import { HomeOutlined, AuditOutlined } from "@ant-design/icons";
import { useIntroAnimation } from "@/hooks/useIntroAnimation";

const { Title, Text } = Typography;

export function PageHeader() {
  const { showIntro } = useIntroAnimation(1500);

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          {
            href: "/",
            title: (
              <>
                <HomeOutlined /> Trang chủ
              </>
            ),
          },
          { title: "Dữ liệu tổng hợp" },
        ]}
      />

      {/* Page Header - Auto hide after 1.5s with smooth collapse */}
      {/* <div
        className={`page-header text-white overflow-hidden transition-all duration-700 ease-out ${
          showIntro ? "max-h-32 p-6 opacity-100" : "max-h-0 p-0 opacity-0 -mt-6"
        }`}
        style={{
          background:
            "linear-gradient(135deg, hsl(250 60% 45%), hsl(280 50% 40%))",
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <AuditOutlined className="text-2xl animate-pulse" />
            <Title level={3} className="!text-white !mb-0">
              Dữ Liệu Tổng Hợp
            </Title>
          </div>
          <Text className="text-white/80">
            Tổng hợp tất cả bút toán kế toán từ phiếu thu và phiếu chi đã duyệt
          </Text>
        </div>
      </div> */}
    </>
  );
}
