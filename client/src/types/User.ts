/** UI Models for User domain (camelCase, boolean types) */

import type { BaseEntity } from '@/types/generated/common';

// Main User UI Model
export interface User extends BaseEntity {
  id: string;
  email: string;
  name: string;
  delYn: string;
  roles?: Role[];
}

// User Create Form Model
export interface CreateUserForm {
  email: string;
  password: string;
  name: string;
  roleIds: string[];
}

// User Update Form Model
export interface UpdateUserForm {
  email: string;
  name: string;
  delYn: string;
}

// User Password Change Form Model
export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
}

// Role UI Model
export interface Role extends BaseEntity {
  id: string;
  roleName: string;
  description?: string;
  isDefault: boolean;
  delYn: string;
}

// User Search Form Model
export interface UserSearchForm {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
  email?: string;
  name?: string;
  delYn?: string;
  roleId?: string;
}

// User Organizations UI Model
export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  organizationName: string;
  description?: string;
}

// User Roles UI Model
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  description?: string;
  isDefault: boolean;
}