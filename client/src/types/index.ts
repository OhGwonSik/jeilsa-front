/** 
 * Barrel exports for all types
 * Generated types, UI models, and mappers
 */

// Common types
export * from '@/types/generated/common';

// Generated DTO types
export { 
  UserDto, 
  CreateUserRequest, 
  UpdateUserRequest, 
  UserSearchRequest
} from '@/types/generated/UserDto';
export { 
  RoleDto as GeneratedRoleDto, 
  CreateRoleRequest, 
  UpdateRoleRequest, 
  RoleSearchRequest,
  RoleBatchRequest,
  RolePermissionDto,
  RolePermissionBatchRequest
} from '@/types/generated/RoleDto';
export { 
  PermissionDto as GeneratedPermissionDto, 
  CreatePermissionRequest, 
  UpdatePermissionRequest, 
  PermissionSearchRequest,
  PermissionBatchRequest
} from '@/types/generated/PermissionDto';
export { 
  OrganizationDto, 
  CreateOrganizationRequest, 
  UpdateOrganizationRequest, 
  OrganizationSearchRequest,
  OrganizationBatchRequest
} from '@/types/generated/OrganizationDto';
export { 
  MenuDto
} from '@/types/generated/MenuDto';

// UI Model types
export { 
  User, 
  CreateUserForm, 
  UpdateUserForm, 
  UserSearchForm
} from '@/types/User';
export { 
  Role as UIRole, 
  CreateRoleForm, 
  UpdateRoleForm, 
  RoleSearchForm,
  RoleBatchForm,
  RolePermissionBatchForm
} from '@/types/Role';
export { 
  Permission as UIPermission, 
  CreatePermissionForm, 
  UpdatePermissionForm, 
  PermissionSearchForm,
  PermissionBatchForm
} from '@/types/Permission';
export { 
  Organization, 
  CreateOrganizationForm, 
  UpdateOrganizationForm, 
  OrganizationSearchForm,
  OrganizationBatchForm
} from '@/types/Organization';
export { 
  Menu
} from '@/types/Menu';

// Mappers
export { 
  dtoToUser, 
  userToDto,
  userSearchFormToDto,
  createUserFormToDto,
  updateUserFormToDto
} from '@/types/mappers/userMapper';
export { 
  dtoToRole as generatedDtoToRole, 
  roleToDto as uiRoleToDto,
  dtoToRolePermission,
  roleSearchFormToDto,
  createRoleFormToDto,
  updateRoleFormToDto,
  roleBatchFormToDto,
  rolePermissionBatchFormToDto
} from '@/types/mappers/roleMapper';
export { 
  dtoToPermission as generatedDtoToPermission, 
  permissionToDto as uiPermissionToDto,
  permissionSearchFormToDto,
  createPermissionFormToDto,
  updatePermissionFormToDto,
  permissionBatchFormToDto
} from '@/types/mappers/permissionMapper';
export { 
  dtoToOrganization, 
  organizationToDto,
  organizationSearchFormToDto,
  createOrganizationFormToDto,
  updateOrganizationFormToDto,
  organizationBatchFormToDto
} from '@/types/mappers/organizationMapper';
export { 
  dtoToMenu, 
  menuToDto
} from '@/types/mappers/menuMapper';