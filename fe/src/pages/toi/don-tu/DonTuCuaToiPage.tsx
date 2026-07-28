import { useEffect } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  DonTuCuaToiHandlerProvider,
  useDonTuCuaToiHandler,
  useDonTuCuaToiState,
} from "./DonTuCuaToiHandlerContext";
import { DanhSachDon } from "./components/DanhSachDon";
import { ChonLoaiDon } from "./components/ChonLoaiDon";
import { FormNopDon } from "./components/FormNopDon";
import { KhoiSoDuPhep } from "./components/KhoiSoDuPhep";
import { LeaveBalance } from "@/services/leaveBalanceService";
import { homNayVN } from "@/ultils/thoiGianVN";

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
  const [soDuPhep] = useDonTuCuaToiState("soDuPhep", [] as LeaveBalance[]);

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="w-full">
      {/* Đầu trang: số dư phép trước cả nút Nộp đơn — NV cần biết mình còn
          bao nhiêu ngày TRƯỚC khi bấm nộp, không phải đọc được nó sau khi đã
          mở form và chọn ngày xong. */}
      <div className="mb-4">
        <KhoiSoDuPhep danhSach={soDuPhep} homNay={homNayVN()} />
      </div>

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
