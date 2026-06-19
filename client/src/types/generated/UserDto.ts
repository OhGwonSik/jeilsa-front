/** source: .../user/controller/UserController.java and related DTOs */

import type { BaseEntity } from '@/types/generated/common';

// Main User DTO (from UserController responses)
export interface UserDto extends BaseEntity {
  id: string;
  email: string;
  name: string;
  active: boolean;
  roles?: RoleDto[];
}

// User Create Request DTO (from UserController.createUser)
export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  roleIds: string[];
}

// User Update Request DTO (from UserController.updateUser)
export interface UpdateUserRequest {
  email: string;
  name: string;
  active: boolean;
}

// User Password Change Request DTO
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Role DTO (nested in User responses)
export interface RoleDto extends BaseEntity {
  id: string;
  roleName: string;
  description?: string;
  isDefault: boolean;
  delYn: string;
}

// User Grid Search Request DTO (from UserController.searchUsers)
export interface UserSearchRequest {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
  email?: string;
  name?: string;
  active?: boolean;
  roleId?: string;
}

// User Organizations Response DTO
export interface UserOrganizationDto {
  id: string;
  userId: string;
  organizationId: string;
  organizationName: string;
  description?: string;
}

// User Roles Response DTO  
export interface UserRoleDto {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  description?: string;
  isDefault: boolean;
}