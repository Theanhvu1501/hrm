import { useEffect } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  DonTuCuaToiHandlerProvider,
  useDonTuCuaToiHandler,
} from "./DonTuCuaToiHandlerContext";
import { DanhSachDon } from "./components/DanhSachDon";
import { ChonLoaiDon } from "./components/ChonLoaiDon";
import { FormNopDon } from "./components/FormNopDon";

/**
 * Màn "Đơn từ" của nhân viên trong vỏ `/toi`.
 *
 * Đây là ĐƯỜNG NỘP ĐƠN DUY NHẤT của nhân viên thường kể từ Task 4: các route
 * quản trị `/don-cham-cong` (GET/POST/PUT/DELETE) nay đòi quyền
 * `/cham-cong/don-tu:*` mà nhân viên không có. Mọi lời gọi ở màn này phải đi
 * qua ba route `cua-toi` (chỉ cần JwtGuard) — xem attendanceRequestService.
 */
function DonTuCuaToiPageInner() {
  const handler = useDonTuCuaToiHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="w-full">
      {/* Nút chính đặt TRÊN danh sách: việc người dùng đến màn này để làm là
          nộp đơn, không phải đọc lại đơn cũ. Bo viên thuốc + teal cho khớp nút
          Chấm công ở tab bên cạnh. */}
      <Button
        type="primary"
        size="large"
        block
        icon={<PlusOutlined />}
        className="mb-4"
        style={{
          height: 48,
          fontSize: 16,
          fontWeight: 700,
          borderRadius: 999,
          backgroundColor: "#1f7769",
          borderColor: "#1f7769",
        }}
        onClick={() => handler.executeEvent("moChonLoai", {})}
      >
        Nộp đơn
      </Button>

      <DanhSachDon />
      <ChonLoaiDon />
      <FormNopDon />
    </div>
  );
}

const DonTuCuaToiPage: React.FC = () => (
  <DonTuCuaToiHandlerProvider>
    <DonTuCuaToiPageInner />
  </DonTuCuaToiHandlerProvider>
);

export default DonTuCuaToiPage;
