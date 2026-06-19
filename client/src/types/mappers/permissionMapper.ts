/** DTO ↔ UI Model mappers for Permission domain */

import type { 
  PermissionDto, 
  CreatePermissionRequest, 
  UpdatePermissionRequest, 
  PermissionSearchRequest,
  PermissionBatchRequest
} from '@/types/generated/PermissionDto';

import type { 
  Permission, 
  CreatePermissionForm, 
  UpdatePermissionForm, 
  PermissionSearchForm,
  PermissionBatchForm
} from '@/types/Permission';

import { toBool, fromBoolYN } from '@/types/generated/common';

// Permission DTO ↔ UI Model
export const dtoToPermission = (dto: PermissionDto): Permission => ({
  ...dto,
  delYn: dto.delYn
});

export const permissionToDto = (permission: Permission): PermissionDto => ({
  ...permission,
  delYn: permission.delYn
});

// Create Permission Form ↔ Request DTO
export const createPermissionFormToDto = (form: CreatePermissionForm): CreatePermissionRequest => ({
  permissionName: form.permissionName,
  description: form.description,
  resource: form.resource,
  action: form.action,
  delYn: form.delYn
});

export const dtoToCreatePermissionForm = (dto: CreatePermissionRequest): CreatePermissionForm => ({
  permissionName: dto.permissionName,
  description: dto.description,
  resource: dto.resource,
  action: dto.action,
  delYn: dto.delYn
});

// Update Permission Form ↔ Request DTO
export const updatePermissionFormToDto = (form: UpdatePermissionForm): UpdatePermissionRequest => ({
  permissionName: form.permissionName,
  description: form.description,
  resource: form.resource,
  action: form.action,
  delYn: form.delYn
});

export const dtoToUpdatePermissionForm = (dto: UpdatePermissionRequest): UpdatePermissionForm => ({
  permissionName: dto.permissionName,
  description: dto.description,
  resource: dto.resource,
  action: dto.action,
  delYn: dto.delYn
});

// Permission Search Form ↔ Request DTO
export const permissionSearchFormToDto = (form: PermissionSearchForm): PermissionSearchRequest => ({
  page: form.page,
  size: form.size,
  sort: form.sort,
  direction: form.direction,
  permissionName: form.permissionName,
  description: form.description,
  resource: form.resource,
  action: form.action,
  delYn: form.delYn
});

export const dtoToPermissionSearchForm = (dto: PermissionSearchRequest): PermissionSearchForm => ({
  page: dto.page,
  size: dto.size,
  sort: dto.sort,
  direction: dto.direction,
  permissionName: dto.permissionName,
  description: dto.description,
  resource: dto.resource,
  action: dto.action,
  delYn: dto.delYn
});

// Permission Batch Form ↔ Request DTO
export const permissionBatchFormToDto = (form: PermissionBatchForm): PermissionBatchRequest => ({
  items: form.items.map(createPermissionFormToDto)
});

export const dtoToPermissionBatchForm = (dto: PermissionBatchRequest): PermissionBatchForm => ({
  items: dto.items.map(dtoToCreatePermissionForm)
});