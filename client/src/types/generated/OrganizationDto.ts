/** source: .../organization/controller/OrganizationController.java and related DTOs */

import type { BaseEntity } from '@/types/generated/common';

// Main Organization DTO (from OrganizationController responses)
export interface OrganizationDto extends BaseEntity {
  organizationId: string;
  organizationName: string;
  description?: string;
  delYn: string;
}

// Organization Create Request DTO (from OrganizationController.createOrganization)
export interface CreateOrganizationRequest {
  organizationName: string;
  description?: string;
  delYn: string;
}

// Organization Update Request DTO (from OrganizationController.updateOrganization)
export interface UpdateOrganizationRequest {
  organizationName: string;
  description?: string;
  delYn: string;
}

// Organization Grid Search Request DTO (from OrganizationController.searchOrganizations)
export interface OrganizationSearchRequest {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
  organizationName?: string;
  description?: string;
 delYn?: string;
}

// Organization Batch Request DTO
export interface OrganizationBatchRequest {
  items: CreateOrganizationRequest[];
}