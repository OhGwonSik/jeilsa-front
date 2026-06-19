/** DTO ↔ UI Model mappers for Role domain */

import type { 
  RoleDto, 
  CreateRoleRequest, 
  UpdateRoleRequest, 
  PermissionDto,
  RoleSearchRequest,
  RolePermissionDto,
  RoleBatchRequest,
  RolePermissionBatchRequest
} from '@/types/generated/RoleDto';

import type { 
  Role, 
  CreateRoleForm, 
  UpdateRoleForm, 
  Permission,
  RoleSearchForm,
  RolePermission,
  RoleBatchForm,
  RolePermissionBatchForm
} from '@/types/Role';

import { toBool, fromBoolYN } from '@/types/generated/common';

// Role DTO ↔ UI Model
export const dtoToRole = (dto: RoleDto): Role => ({
  ...dto,
  isDefault: toBool(dto.isDefault),
  delYn: dto.delYn,
  permissions: dto.permissions?.map(dtoToPermission)
});

export const roleToDto = (role: Role): RoleDto => ({
  ...role,
  isDefault: role.isDefault,
  delYn: role.delYn,
  permissions: role.permissions?.map(permissionToDto)
});

// Permission DTO ↔ UI Model
export const dtoToPermission = (dto: PermissionDto): Permission => ({
  ...dto,
  delYn: dto.delYn
});

export const permissionToDto = (permission: Permission): PermissionDto => ({
  ...permission,
  delYn: permission.delYn
});

// Create Role Form ↔ Request DTO
export const createRoleFormToDto = (form: CreateRoleForm): CreateRoleRequest => ({
  roleName: form.roleName,
  description: form.description,
  isDefault: form.isDefault,
  delYn: form.delYn,
  permissionIds: form.permissionIds
});

export const dtoToCreateRoleForm = (dto: CreateRoleRequest): CreateRoleForm => ({
  roleName: dto.roleName,
  description: dto.description,
  isDefault: toBool(dto.isDefault),
  delYn: dto.delYn,
  permissionIds: dto.permissionIds
});

// Update Role Form ↔ Request DTO
export const updateRoleFormToDto = (form: UpdateRoleForm): UpdateRoleRequest => ({
  roleName: form.roleName,
  description: form.description,
  isDefault: form.isDefault,
  delYn: form.delYn
});

export const dtoToUpdateRoleForm = (dto: UpdateRoleRequest): UpdateRoleForm => ({
  roleName: dto.roleName,
  description: dto.description,
  isDefault: toBool(dto.isDefault),
  delYn: dto.delYn
});

// Role Search Form ↔ Request DTO
export const roleSearchFormToDto = (form: RoleSearchForm): RoleSearchRequest => ({
  page: form.page,
  size: form.size,
  sort: form.sort,
  direction: form.direction,
  roleName: form.roleName,
  description: form.description,
  isDefault: form.isDefault,
  delYn: form.delYn,
  permissionId: form.permissionId
});

export const dtoToRoleSearchForm = (dto: RoleSearchRequest): RoleSearchForm => ({
  page: dto.page,
  size: dto.size,
  sort: dto.sort,
  direction: dto.direction,
  roleName: dto.roleName,
  description: dto.description,
  isDefault: dto.isDefault,
  delYn: dto.delYn,
  permissionId: dto.permissionId
});

// Role Permission DTO ↔ UI Model
export const dtoToRolePermission = (dto: RolePermissionDto): RolePermission => ({
  ...dto
});

export const rolePermissionToDto = (rolePermission: RolePermission): RolePermissionDto => ({
  ...rolePermission
});

// Role Batch Form ↔ Request DTO
export const roleBatchFormToDto = (form: RoleBatchForm): RoleBatchRequest => ({
  items: form.items.map(createRoleFormToDto)
});

export const dtoToRoleBatchForm = (dto: RoleBatchRequest): RoleBatchForm => ({
  items: dto.items.map(dtoToCreateRoleForm)
});

// Role Permission Batch Form ↔ Request DTO
export const rolePermissionBatchFormToDto = (form: RolePermissionBatchForm): RolePermissionBatchRequest => ({
  permissionIds: form.permissionIds
});

export const dtoToRolePermissionBatchForm = (dto: RolePermissionBatchRequest): RolePermissionBatchForm => ({
  permissionIds: dto.permissionIds
});