import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';

export interface SoftDeleteBatchResult {
  deleted: number;
  skipped: number;
}

/**
 * Xóa mềm hàng loạt (isActive = false).
 *
 * - Repository đã tự lọc theo tenant (TenantSubscriber) nên chỉ đụng được dữ liệu của tenant hiện tại.
 * - `canDelete` giữ đúng guard của hàm xóa đơn (vd không xóa đề xuất đã duyệt): dòng bị chặn rơi vào
 *   `skipped`, KHÔNG ném lỗi làm hỏng cả lô.
 * - Id sai định dạng hoặc không tồn tại: bỏ qua, không tính vào deleted lẫn skipped.
 */
export async function softDeleteBatch<T extends { isActive?: boolean }>(
  repo: MongoRepository<T>,
  ids: string[],
  canDelete?: (entity: T) => boolean,
): Promise<SoftDeleteBatchResult> {
  if (!ids || ids.length === 0) return { deleted: 0, skipped: 0 };

  const objectIds = ids
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  if (objectIds.length === 0) return { deleted: 0, skipped: 0 };

  const found = await repo.find({
    where: { _id: { $in: objectIds } } as never,
  });

  const deletable = canDelete ? found.filter((e) => canDelete(e)) : found;
  const skipped = found.length - deletable.length;

  if (deletable.length > 0) {
    for (const entity of deletable) entity.isActive = false;
    await repo.save(deletable as never);
  }

  return { deleted: deletable.length, skipped };
}
