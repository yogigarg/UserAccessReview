-- =====================================================
-- Core Schema - User Access Review Application
-- =====================================================

-- ============================================
-- CORE IDENTITY & USER MANAGEMENT
-- ============================================

-- Organizations/Tenants table (for multi-tenancy)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    domain VARCHAR(255),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_id UUID, -- Will reference users(id), added after users table
    cost_center VARCHAR(50),
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

-- Users table (Core identity)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- For authentication
    role user_role DEFAULT 'user',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    location VARCHAR(255),
    job_title VARCHAR(255),
    status user_status DEFAULT 'active',
    hire_date DATE,
    termination_date DATE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    profile_data JSONB DEFAULT '{}',
    is_service_account BOOLEAN DEFAULT false,
    is_contractor BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Add foreign key for department manager after users table is created
ALTER TABLE departments 
    ADD CONSTRAINT fk_department_manager 
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- User sessions (for authentication tracking)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- APPLICATION & ACCESS MANAGEMENT
-- ============================================

-- Applications/Systems
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    application_type VARCHAR(50), -- ERP, CRM, SaaS, Directory, etc.
    vendor VARCHAR(100),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    business_criticality VARCHAR(20) CHECK (business_criticality IN ('critical', 'high', 'medium', 'low')),
    compliance_scope VARCHAR(50), -- SOX, HIPAA, PCI-DSS, etc.
    connector_type VARCHAR(50), -- AD, Azure AD, Okta, SAP, Salesforce, etc.
    connector_config JSONB DEFAULT '{}',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

-- Roles (within applications)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    role_type VARCHAR(50), -- Standard, Privileged, Custom, etc.
    risk_level VARCHAR(20) CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
    permissions JSONB DEFAULT '[]', -- Array of permission objects
    is_sensitive BOOLEAN DEFAULT false,
    requires_justification BOOLEAN DEFAULT false,
    max_assignment_duration INTEGER, -- in days
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(application_id, code)
);

-- User Access (User-Application-Role mapping)
CREATE TABLE user_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    access_type VARCHAR(50), -- Direct, Inherited, Group-based, etc.
    grant_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    last_used_date DATE,
    granted_by UUID REFERENCES users(id),
    business_justification TEXT,
    approval_reference VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, application_id, role_id)
);

-- ============================================
-- SEPARATION OF DUTIES (SOD) ENGINE
-- ============================================

-- SOD Rule Templates
CREATE TABLE sod_rule_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    process_area VARCHAR(100), -- O2C, P2P, R2R, etc.
    is_standard BOOLEAN DEFAULT true,
    template_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SOD Rules
CREATE TABLE sod_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES sod_rule_templates(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    severity sod_severity DEFAULT 'medium',
    process_area VARCHAR(100),
    conflicting_roles JSONB NOT NULL, -- Array of role combinations
    application_ids UUID[], -- Array of application IDs
    auto_remediate BOOLEAN DEFAULT false,
    requires_exception_approval BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    violation_count INTEGER DEFAULT 0,
    last_evaluated_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SOD Violations
CREATE TABLE sod_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES sod_rules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    violation_details JSONB NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_action VARCHAR(50), -- revoked, exception_granted, mitigating_control
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    exception_expiry DATE,
    risk_assessment JSONB DEFAULT '{}',
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ACCESS REVIEW CAMPAIGNS
-- ============================================

-- Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type campaign_type DEFAULT 'manager_review',
    status campaign_status DEFAULT 'draft',
    scope_config JSONB NOT NULL, -- filters for users/apps/departments
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reminder_frequency INTEGER DEFAULT 3, -- days
    escalation_enabled BOOLEAN DEFAULT true,
    escalation_days INTEGER DEFAULT 7,
    completion_percentage NUMERIC(5,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    completed_reviews INTEGER DEFAULT 0,
    approved_count INTEGER DEFAULT 0,
    revoked_count INTEGER DEFAULT 0,
    exception_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    launched_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Reviewers (Assignment)
CREATE TABLE campaign_reviewers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    backup_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    scope_filter JSONB, -- specific users/apps this reviewer handles
    total_assigned INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(campaign_id, reviewer_id)
);

-- Review Items (Individual access items to review)
CREATE TABLE review_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    access_id UUID REFERENCES user_access(id) ON DELETE SET NULL,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision review_decision DEFAULT 'pending',
    decision_date TIMESTAMP WITH TIME ZONE,
    rationale TEXT,
    is_flagged BOOLEAN DEFAULT false, -- for SOD violations or high-risk
    flag_reason TEXT,
    risk_indicators JSONB DEFAULT '{}',
    delegated_to UUID REFERENCES users(id),
    delegation_reason TEXT,
    access_details JSONB NOT NULL, -- snapshot of access at review time
    remediation_status remediation_status,
    remediation_date TIMESTAMP WITH TIME ZONE,
    remediation_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Review Comments/History
CREATE TABLE review_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_item_id UUID NOT NULL REFERENCES review_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    comment_type VARCHAR(50), -- note, question, justification, etc.
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NOTIFICATIONS & COMMUNICATIONS
-- ============================================

-- Notification Templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(100) NOT NULL, -- campaign_start, reminder, escalation, etc.
    channel notification_channel DEFAULT 'email',
    subject VARCHAR(500),
    body_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Available template variables
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Queue
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    channel notification_channel DEFAULT 'email',
    recipient_address VARCHAR(500) NOT NULL,
    subject VARCHAR(500),
    body TEXT NOT NULL,
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, cancelled
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    related_entity_type VARCHAR(50), -- campaign, review_item, etc.
    related_entity_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INTEGRATIONS & CONNECTORS
-- ============================================

-- Connector Configurations
CREATE TABLE connector_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    connector_type VARCHAR(100) NOT NULL, -- AD, AzureAD, Okta, SAP, etc.
    connection_settings JSONB NOT NULL, -- encrypted credentials, endpoints
    sync_schedule VARCHAR(100), -- cron expression
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR(50),
    last_sync_records INTEGER,
    last_sync_error TEXT,
    health_status VARCHAR(50) DEFAULT 'unknown',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(application_id)
);

-- Sync History/Logs
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connector_config_id UUID NOT NULL REFERENCES connector_configs(id) ON DELETE CASCADE,
    sync_type VARCHAR(50), -- full, incremental, manual
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50), -- running, completed, failed, partial
    records_processed INTEGER DEFAULT 0,
    records_added INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    error_details JSONB,
    duration_seconds INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AUDIT & COMPLIANCE
-- ============================================

-- Audit Logs (Immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    entity_name VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Compliance Reports
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    report_type VARCHAR(100) NOT NULL, -- campaign_summary, sod_violations, etc.
    report_period_start DATE,
    report_period_end DATE,
    generated_by UUID NOT NULL REFERENCES users(id),
    report_data JSONB NOT NULL,
    file_path VARCHAR(500),
    file_format VARCHAR(20), -- PDF, Excel, CSV
    file_size_bytes BIGINT,
    digital_signature VARCHAR(500), -- for immutability proof
    is_official BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RISK & ANALYTICS
-- ============================================

-- Risk Profiles (User risk scoring)
CREATE TABLE risk_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_risk_score INTEGER CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    access_risk_score INTEGER,
    behavioral_risk_score INTEGER,
    compliance_risk_score INTEGER,
    privileged_access_count INTEGER DEFAULT 0,
    sod_violation_count INTEGER DEFAULT 0,
    dormant_account_flag BOOLEAN DEFAULT false,
    excessive_access_flag BOOLEAN DEFAULT false,
    risk_factors JSONB DEFAULT '{}',
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_review_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Access Analytics (aggregated metrics)
CREATE TABLE access_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_access_items INTEGER DEFAULT 0,
    high_risk_access_count INTEGER DEFAULT 0,
    sod_violations_count INTEGER DEFAULT 0,
    dormant_accounts_count INTEGER DEFAULT 0,
    privileged_accounts_count INTEGER DEFAULT 0,
    access_granted_count INTEGER DEFAULT 0,
    access_revoked_count INTEGER DEFAULT 0,
    review_completion_rate NUMERIC(5,2),
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, metric_date)
);

-- ============================================
-- CONFIGURATION & SETTINGS
-- ============================================

-- System Configuration
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    config_key VARCHAR(255) NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    is_system_level BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    UNIQUE(organization_id, config_key)
);

-- Feature Flags
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    allowed_users UUID[], -- specific users who can access
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, feature_name)
);

-- Comments on important tables
COMMENT ON TABLE users IS 'Core user identity table with HRMS integration';
COMMENT ON TABLE user_access IS 'User-Application-Role access mapping with lifecycle tracking';
COMMENT ON TABLE campaigns IS 'Access review campaigns for compliance certification';
COMMENT ON TABLE review_items IS 'Individual access items within campaigns for reviewer decision';
COMMENT ON TABLE sod_violations IS 'Detected Separation of Duties violations requiring remediation';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance and forensics';