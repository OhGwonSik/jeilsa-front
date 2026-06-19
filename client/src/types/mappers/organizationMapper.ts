/** DTO ↔ UI Model mappers for Organization domain */

import type { 
  OrganizationDto, 
  CreateOrganizationRequest, 
  UpdateOrganizationRequest, 
  OrganizationSearchRequest,
  OrganizationBatchRequest
} from '@/types/generated/OrganizationDto';

import type { 
  Organization, 
  CreateOrganizationForm, 
  UpdateOrganizationForm, 
  OrganizationSearchForm,
  OrganizationBatchForm
} from '@/types/Organization';

import { toBool, fromBoolYN } from '@/types/generated/common';

// Organization DTO ↔ UI Model
export const dtoToOrganization = (dto: OrganizationDto): Organization => ({
  ...dto,
  delYn: dto.delYn
});

export const organizationToDto = (organization: Organization): OrganizationDto => ({
  ...organization,
  delYn: organization.delYn
});

// Create Organization Form ↔ Request DTO
export const createOrganizationFormToDto = (form: CreateOrganizationForm): CreateOrganizationRequest => ({
  organizationName: form.organizationName,
  description: form.description,
  delYn: form.delYn
});

export const dtoToCreateOrganizationForm = (dto: CreateOrganizationRequest): CreateOrganizationForm => ({
  organizationName: dto.organizationName,
  description: dto.description,
  delYn: dto.delYn
});

// Update Organization Form ↔ Request DTO
export const updateOrganizationFormToDto = (form: UpdateOrganizationForm): UpdateOrganizationRequest => ({
  organizationName: form.organizationName,
  description: form.description,
  delYn: form.delYn
});

export const dtoToUpdateOrganizationForm = (dto: UpdateOrganizationRequest): UpdateOrganizationForm => ({
  organizationName: dto.organizationName,
  description: dto.description,
  delYn: dto.delYn
});

// Organization Search Form ↔ Request DTO
export const organizationSearchFormToDto = (form: OrganizationSearchForm): OrganizationSearchRequest => ({
  page: form.page,
  size: form.size,
  sort: form.sort,
  direction: form.direction,
  organizationName: form.organizationName,
  description: form.description,
  delYn: form.delYn
});

export const dtoToOrganizationSearchForm = (dto: OrganizationSearchRequest): OrganizationSearchForm => ({
  page: dto.page,
  size: dto.size,
  sort: dto.sort,
  direction: dto.direction,
  organizationName: dto.organizationName,
  description: dto.description,
  delYn: dto.delYn
});

// Organization Batch Form ↔ Request DTO
export const organizationBatchFormToDto = (form: OrganizationBatchForm): OrganizationBatchRequest => ({
  items: form.items.map(createOrganizationFormToDto)
});

export const dtoToOrganizationBatchForm = (dto: OrganizationBatchRequest): OrganizationBatchForm => ({
  items: dto.items.map(dtoToCreateOrganizationForm)
});