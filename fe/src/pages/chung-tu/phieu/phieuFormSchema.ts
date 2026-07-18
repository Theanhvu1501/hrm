import { z } from "zod";

export const phieuFormSchema = z.object({
  ngay: z.string().min(1, "Vui lòng chọn ngày"),
  soTien: z.number().positive("Số tiền phải lớn hơn 0"),
  noiDung: z.string().min(1, "Vui lòng nhập nội dung"),
  nguoiGiaoDich: z.string().max(200).optional().nullable(),
  diaChi: z.string().max(500).optional().nullable(),
  ghiChu: z.string().max(1000).optional().nullable(),
});

export type PhieuFormValues = z.infer<typeof phieuFormSchema>;
