/** source: .../role/controller/RoleController.java and related DTOs */

import type { BaseEntity } from '@/types/generated/common';

// Main Role DTO (from RoleController responses)
export interface RoleDto extends BaseEntity {
  roleId: string;
  roleName: string;
  description?: string;
  isDefault: boolean;
  delYn: string;
  permissions?: PermissionDto[];
}

// Role Create Request DTO (from RoleController.createRole)
export interface CreateRoleRequest {
  roleName: string;
  description?: string;
  isDefault: boolean;
  delYn: string;
  permissionIds?: string[];
}

// Role Update Request DTO (from RoleController.updateRole)
export interface UpdateRoleRequest {
  roleName: string;
  description?: string;
  isDefault: boolean;
  delYn: string;
}

// Permission DTO (nested in Role responses)
export interface PermissionDto extends BaseEntity {
  id: string;
  permissionName: string;
  description?: string;
  resource: string;
  action: string;
  delYn: string;
}

// Role Grid Search Request DTO (from RoleController.searchRoles)
export interface RoleSearchRequest {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
  roleName?: string;
  description?: string;
  isDefault?: boolean;
 delYn?: string;
  permissionId?: string;
}

// Role Permissions Response DTO
export interface RolePermissionDto {
  id: string;
  roleId: string;
  permissionId: string;
  permissionName: string;
  description?: string;
  resource: string;
  action: string;
}

// Role Batch Request DTO
export interface RoleBatchRequest {
  items: CreateRoleRequest[];
}

// Role Permission Batch Request DTO
export interface RolePermissionBatchRequest {
  permissionIds: string[];
}