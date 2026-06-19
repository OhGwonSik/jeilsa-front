/** source: .../permission/controller/PermissionController.java and related DTOs */

import type { BaseEntity } from '@/types/generated/common';

// Main Permission DTO (from PermissionController responses)
export interface PermissionDto extends BaseEntity {
  id: string;
  permissionName: string;
  description?: string;
  resource: string;
  action: string;
  delYn: string;
}

// Permission Create Request DTO (from PermissionController.createPermission)
export interface CreatePermissionRequest {
  permissionName: string;
  description?: string;
  resource: string;
  action: string;
  delYn: string;
}

// Permission Update Request DTO (from PermissionController.updatePermission)
export interface UpdatePermissionRequest {
  permissionName: string;
  description?: string;
  resource: string;
  action: string;
  delYn: string;
}

// Permission Grid Search Request DTO (from PermissionController.searchPermissions)
export interface PermissionSearchRequest {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
  permissionName?: string;
  description?: string;
  resource?: string;
  action?: string;
 delYn?: string;
}

// Permission Batch Request DTO
export interface PermissionBatchRequest {
  items: CreatePermissionRequest[];
}