/** DTO ↔ UI Model mappers for User domain */

import type { 
  UserDto, 
  CreateUserRequest, 
  UpdateUserRequest, 
  ChangePasswordRequest,
  RoleDto,
  UserSearchRequest,
  UserOrganizationDto,
  UserRoleDto
} from '@/types/generated/UserDto';

import type { 
  User, 
  CreateUserForm, 
  UpdateUserForm, 
  ChangePasswordForm,
  Role,
  UserSearchForm,
  UserOrganization,
  UserRole
} from '@/types/User';

import { toBool, fromBoolYN } from '@/types/generated/common';

// User DTO ↔ UI Model
export const dtoToUser = (dto: UserDto): User => ({
  ...dto,
  delYn : dto.delYn,
  roles: dto.roles?.map(dtoToRole)
});

export const userToDto = (user: User): UserDto => ({
  ...user,
  active: user.delYn
});

// Role DTO ↔ UI Model
export const dtoToRole = (dto: RoleDto): Role => ({
  ...dto,
  isDefault: toBool(dto.isDefault),
  delYn: dto.delYn
});

export const roleToDto = (role: Role): RoleDto => ({
  ...role,
  isDefault: role.isDefault,
  delYn: role.delYn
});

// Create User Form ↔ Request DTO
export const createUserFormToDto = (form: CreateUserForm): CreateUserRequest => ({
  email: form.email,
  password: form.password,
  name: form.name,
  roleIds: form.roleIds
});

export const dtoToCreateUserForm = (dto: CreateUserRequest): CreateUserForm => ({
  email: dto.email,
  password: dto.password,
  name: dto.name,
  roleIds: dto.roleIds
});

// Update User Form ↔ Request DTO
export const updateUserFormToDto = (form: UpdateUserForm): UpdateUserRequest => ({
  email: form.email,
  name: form.name,
  active: form.delYn
});

export const dtoToUpdateUserForm = (dto: UpdateUserRequest): UpdateUserForm => ({
  email: dto.email,
  name: dto.name,
  delYn : dto.delYn
});

// Change Password Form ↔ Request DTO
export const changePasswordFormToDto = (form: ChangePasswordForm): ChangePasswordRequest => ({
  currentPassword: form.currentPassword,
  newPassword: form.newPassword
});

export const dtoToChangePasswordForm = (dto: ChangePasswordRequest): ChangePasswordForm => ({
  currentPassword: dto.currentPassword,
  newPassword: dto.newPassword
});

// User Search Form ↔ Request DTO
export const userSearchFormToDto = (form: UserSearchForm): UserSearchRequest => ({
  page: form.page,
  size: form.size,
  sort: form.sort,
  direction: form.direction,
  email: form.email,
  name: form.name,
  active: form.delYn,
  roleId: form.roleId
});

export const dtoToUserSearchForm = (dto: UserSearchRequest): UserSearchForm => ({
  page: dto.page,
  size: dto.size,
  sort: dto.sort,
  direction: dto.direction,
  email: dto.email,
  name: dto.name,
  delYn: dto.active,
  roleId: dto.roleId
});

// User Organization DTO ↔ UI Model
export const dtoToUserOrganization = (dto: UserOrganizationDto): UserOrganization => ({
  ...dto
});

export const userOrganizationToDto = (userOrg: UserOrganization): UserOrganizationDto => ({
  ...userOrg
});

// User Role DTO ↔ UI Model
export const dtoToUserRole = (dto: UserRoleDto): UserRole => ({
  ...dto,
  isDefault: toBool(dto.isDefault)
});

export const userRoleToDto = (userRole: UserRole): UserRoleDto => ({
  ...userRole,
  isDefault: userRole.isDefault
});