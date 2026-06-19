/** source: Common types extracted from backend API responses */

// API Response Wrapper Types
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: string;
}

export interface ApiFail {
  success: false;
  error: ApiErrorShape;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFail;

// Pagination Types
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

// Grid Search Types
export interface GridSearchRequest {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
  [key: string]: any;
}

// Batch Operation Types
export interface BatchRequest<T> {
  items: T[];
}

// Common Entity Fields
export interface BaseEntity {
  createdBy?: string;
  createdDate?: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
}

// Utility Functions
export function extractData<T>(resp: ApiResponse<T> | T): T {
  if ((resp as any)?.success === false) {
    const err = (resp as any).error;
    throw new Error(err?.message || 'API_FAIL');
  }
  return (resp as any)?.data ?? (resp as any);
}

export const toBool = (v: any): boolean => v === true || v === 'Y' || v === 1 || v === 't';

export const fromBoolYN = (b: boolean): string => (b ? 'Y' : 'N');

export const formatDateYYYYMMDD = (s: string): string => {
  if (!s) return '';
  const date = new Date(s);
  return date.toISOString().split('T')[0];
};