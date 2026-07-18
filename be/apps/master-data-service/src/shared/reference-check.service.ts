import { Injectable, ConflictException } from '@nestjs/common';

/**
 * Service to check for references before deleting master data
 * This will be extended when Voucher Service is implemented
 */
@Injectable()
export class ReferenceCheckService {
  /**
   * Check if a TaiKhoan is referenced by any vouchers
   * @param taiKhoanId - Account ID to check
   * @returns true if references exist
   */
  async checkTaiKhoanReferences(taiKhoanId: string): Promise<boolean> {
    // TODO: Implement when Voucher Service is available
    // Will check chung_tu collection for taiKhoanNo or taiKhoanCo references
    void taiKhoanId;
    return Promise.resolve(false);
  }

  /**
   * Check if a DoiTuong is referenced by any vouchers or payables
   * @param doiTuongId - Entity ID to check
   * @returns true if references exist
   */
  async checkDoiTuongReferences(doiTuongId: string): Promise<boolean> {
    // TODO: Implement when Voucher/Payable Service is available
    // Will check chung_tu and cong_no collections
    void doiTuongId;
    return Promise.resolve(false);
  }

  /**
   * Check if a DuAn is referenced by any vouchers
   * @param duAnId - Project ID to check
   * @returns true if references exist
   */
  async checkDuAnReferences(duAnId: string): Promise<boolean> {
    // TODO: Implement when Voucher Service is available
    // Will check chung_tu collection for duAnId references
    void duAnId;
    return Promise.resolve(false);
  }

  /**
   * Throw error if references exist
   */
  throwIfReferencesExist(
    entityType: string,
    entityId: string,
    hasReferences: boolean,
  ): void {
    if (hasReferences) {
      throw new ConflictException(
        `Cannot delete ${entityType} with ID ${entityId} because it is referenced by other records`,
      );
    }
  }
}
