/** UI Models for Role domain (camelCase, boolean types) */

import type { BaseEntity } from '@/types/generated/common';

// Main Role UI Model
export interface Role extends BaseEntity {
  roleId: string;
  roleName: string;
  description?: string;
  isDefault: boolean;
  delYn: string;
  permissions?: Permission[];
}

// Role Create Form Model
export interface CreateRoleForm {
  roleName: string;
  description?: string;
  isDefault: boolean;
  delYn: string;
  permissionIds?: string[];
}

// Role Update Form Model
export interface UpdateRoleForm {
  roleName: string;
  description?: string;
  isDefault: boolean;
  delYn: string;
}

// Permission UI Model
export interface Permission extends BaseEntity {
  id: string;
  permissionName: string;
  description?: string;
  resource: string;
  action: string;
  delYn: string;
}

// Role Search Form Model
export interface RoleSearchForm {
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

// Role Permissions UI Model
export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  permissionName: string;
  description?: string;
  resource: string;
  action: string;
}

// Role Batch Form Model
export interface RoleBatchForm {
  items: CreateRoleForm[];
}

// Role Permission Batch Form Model
export interface RolePermissionBatchForm {
  permissionIds: string[];
}