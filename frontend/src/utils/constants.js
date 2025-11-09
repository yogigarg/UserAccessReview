export const USER_ROLES = {
  ADMIN: 'admin',
  COMPLIANCE_MANAGER: 'compliance_manager',
  REVIEWER: 'reviewer',
  MANAGER: 'manager',
  USER: 'user',
}

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TERMINATED: 'terminated',
  SUSPENDED: 'suspended',
}

export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const CAMPAIGN_TYPE = {
  MANAGER_REVIEW: 'manager_review',
  APPLICATION_OWNER: 'application_owner',
  BOTH: 'both',
  AD_HOC: 'ad_hoc',
}

export const REVIEW_DECISION = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REVOKED: 'revoked',
  EXCEPTION: 'exception',
  DELEGATED: 'delegated',
}

export const SOD_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

export const RISK_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}