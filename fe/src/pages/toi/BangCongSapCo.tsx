import { TableOutlined } from "@ant-design/icons";

/**
 * Chỗ tạm cho tab "Bảng công" trong vỏ nhân viên.
 *
 * Cố ý KHÔNG dùng ComingSoonPage của khu kế toán: component đó có nút "Về
 * trang chủ" đẩy người dùng ra `/` (khỏi vỏ /toi), tên lửa nhấp nháy và nền
 * gradient lạc hẳn ngôn ngữ iOS của app này. Ở đây chỉ một dòng gọn gàng,
 * đúng nhịp thẻ iOS, người dùng vẫn ở nguyên trong app.
 */
export default function BangCongSapCo() {
  return (
    <div className="w-full">
      <div className="emp-card flex flex-col items-center px-6 py-12 text-center">
        <span
          className="emp-icon-tile"
          style={{
            background: "linear-gradient(135deg, #b07bf5, #8944ab)",
            width: 60,
            height: 60,
            borderRadius: 16,
            fontSize: 27,
          }}
        >
          <TableOutlined />
        </span>
        <div className="mt-4 text-[17px] font-semibold">Bảng công</div>
        <div className="mt-1.5 text-[14px] text-[color:var(--emp-text-phu)]">
          Sắp có. Bạn sẽ xem được tổng công, đi muộn và ngày nghỉ theo tháng
          ngay tại đây.
        </div>
      </div>
    </div>
  );
}
