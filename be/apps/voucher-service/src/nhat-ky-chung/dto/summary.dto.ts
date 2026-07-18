import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * Summary types for grouping journal entries
 */
export type SummaryType =
  | 'account'
  | 'team'
  | 'employee'
  | 'project'
  | 'investor'
  | 'product'
  | 'cash-flow'
  | 'management-group'
  | 'promotion-group';

export const SUMMARY_TYPES: SummaryType[] = [
  'account',
  'team',
  'employee',
  'project',
  'investor',
  'product',
  'cash-flow',
  'management-group',
  'promotion-group',
];

/**
 * Summary item returned from aggregation
 */
export interface SummaryItem {
  key: string;
  ten?: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soLuong: number;
}

/**
 * Query DTO for summary endpoint
 */
export class SummaryQueryDto {
  @IsEnum(SUMMARY_TYPES)
  type: SummaryType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

/**
 * Response wrapper for summary data
 */
export interface SummaryResponse {
  success: boolean;
  data: SummaryItem[];
}
