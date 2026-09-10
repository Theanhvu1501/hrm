import type { ReactNode } from "react";

/**
 * Nhãn trường của các form react-hook-form (không dùng Form.Item của antd).
 * Cỡ chữ bám thang của hệ thiết kế chung với ke-toan-so: nhãn 11px/500 —
 * đúng cỡ nhãn mà Form.Item antd tự vẽ với token fontSize 11, để form
 * react-hook-form và form antd đặt cạnh nhau không lệch cỡ.
 */
export function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-[3px] block text-[11px] font-medium leading-[16px] text-[hsl(var(--ink))]">
      {children}
      {required && <span className="ml-0.5 text-[hsl(var(--red))]">*</span>}
    </label>
  );
}

/** Dòng báo lỗi dưới ô nhập — cùng họ màu --red với dấu * bắt buộc. */
export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <div className="mt-[2px] text-[10.5px] text-[hsl(var(--red))]">{children}</div>;
}
