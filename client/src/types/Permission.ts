/** UI Models for Permission domain (camelCase, boolean types) */

import type { BaseEntity } from '@/types/generated/common';

// Main Permission UI Model
export interface Permission extends BaseEntity {
  id: string;
  permissionName: string;
  description?: string;
  resource: string;
  action: string;
  delYn: string;
}

// Permission Create Form Model
export interface CreatePermissionForm {
  permissionName: string;
  description?: string;
  resource: string;
  action: string;
  delYn: string;
}

// Permission Update Form Model
export interface UpdatePermissionForm {
  permissionName: string;
  description?: string;
  resource: string;
  action: string;
  delYn: string;
}

// Permission Search Form Model
export interface PermissionSearchForm {
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

// Permission Batch Form Model
export interface PermissionBatchForm {
  items: CreatePermissionForm[];
}