/** UI Models for Organization domain (camelCase, boolean types) */

import type { BaseEntity } from '@/types/generated/common';

// Main Organization UI Model
export interface Organization extends BaseEntity {
  organizationId: string;
  organizationName: string;
  description?: string;
  delYn: string;
}

// Organization Create Form Model
export interface CreateOrganizationForm {
  organizationName: string;
  description?: string;
  delYn: string;
}

// Organization Update Form Model
export interface UpdateOrganizationForm {
  organizationName: string;
  description?: string;
  delYn: string;
}

// Organization Search Form Model
export interface OrganizationSearchForm {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
  organizationName?: string;
  description?: string;
 delYn?: string;
}

// Organization Batch Form Model
export interface OrganizationBatchForm {
  items: CreateOrganizationForm[];
}