import { useState } from "react";
import { Card, Tabs } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import CaLamViecPage from "../ca-lam-viec/CaLamViecPage";
import CauHinhChamCongPage from "./CauHinhChamCongPage";

interface Props {
  /** Tab mở sẵn — route `/cham-cong/cau-hinh` vào thẳng "Thiết lập chung". */
  tabMacDinh?: "ca" | "chung";
}

/**
 * Gộp "Cấu hình ca làm việc" và "Cấu hình chấm công" vào MỘT màn (yêu cầu
 * d24: "Gộp cấu hình chấm công và ca làm việc gộp vào cho gọn").
 *
 * Hai màn cũ vẫn giữ nguyên code và quyền riêng: đây chỉ là cái vỏ hai tab.
 * Gộp bằng cách viết lại thành một màn duy nhất sẽ phải trộn hai handler, hai
 * bộ state và hai bộ quyền — nhiều rủi ro cho một yêu cầu về SẮP XẾP.
 *
 * Tab "Thiết lập chung" chỉ hiện với người có quyền xem nó: vai trò chỉ được
 * cấp quyền ca làm việc mà thấy tab kia rồi bấm vào nhận 403 thì tệ hơn là
 * không thấy.
 */
export function CauHinhChamCongGopPage({ tabMacDinh = "ca" }: Props) {
  const { hasPermission } = useAuth();
  const xemDuocChung = hasPermission("/cham-cong/cau-hinh:xem");
  const xemDuocCa = hasPermission("/cham-cong/ca-lam-viec:xem");

  const [tab, setTab] = useState<string>(
    tabMacDinh === "chung" && xemDuocChung ? "chung" : "ca",
  );

  const items = [
    ...(xemDuocCa
      ? [{ key: "ca", label: "Ca làm việc", children: <CaLamViecPage /> }]
      : []),
    ...(xemDuocChung
      ? [
          {
            key: "chung",
            label: "Thiết lập chung",
            children: <CauHinhChamCongPage />,
          },
        ]
      : []),
  ];

  return (
    <Card>
      <Tabs items={items} activeKey={tab} onChange={setTab} />
    </Card>
  );
}

export default CauHinhChamCongGopPage;
