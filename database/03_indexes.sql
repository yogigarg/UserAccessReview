-- =====================================================
-- Indexes for Performance Optimization
-- User Access Review Application
-- =====================================================

-- ============================================
-- USERS & IDENTITY
-- ============================================

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_org_status ON users(organization_id, status);
CREATE INDEX idx_users_service_account ON users(is_service_account) WHERE is_service_account = true;
CREATE INDEX idx_users_contractor ON users(is_contractor) WHERE is_contractor = true;
CREATE INDEX idx_users_termination_date ON users(termination_date) WHERE termination_date IS NOT NULL;

CREATE INDEX idx_departments_organization_id ON departments(organization_id);
CREATE INDEX idx_departments_parent_id ON departments(parent_department_id);
CREATE INDEX idx_departments_manager_id ON departments(manager_id);
CREATE INDEX idx_departments_org_code ON departments(organization_id, code);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- ============================================
-- APPLICATIONS & ACCESS
-- ============================================

CREATE INDEX idx_applications_organization_id ON applications(organization_id);
CREATE INDEX idx_applications_owner_id ON applications(owner_id);
CREATE INDEX idx_applications_connector_type ON applications(connector_type);
CREATE INDEX idx_applications_org_code ON applications(organization_id, code);
CREATE INDEX idx_applications_active ON applications(is_active) WHERE is_active = true;
CREATE INDEX idx_applications_criticality ON applications(business_criticality);
CREATE INDEX idx_applications_risk_score ON applications(risk_score);

CREATE INDEX idx_roles_application_id ON roles(application_id);
CREATE INDEX idx_roles_app_code ON roles(application_id, code);
CREATE INDEX idx_roles_risk_level ON roles(risk_level);
CREATE INDEX idx_roles_sensitive ON roles(is_sensitive) WHERE is_sensitive = true;

CREATE INDEX idx_user_access_user_id ON user_access(user_id);
CREATE INDEX idx_user_access_application_id ON user_access(application_id);
CREATE INDEX idx_user_access_role_id ON user_access(role_id);
CREATE INDEX idx_user_access_user_app ON user_access(user_id, application_id);
CREATE INDEX idx_user_access_active ON user_access(is_active) WHERE is_active = true;
CREATE INDEX idx_user_access_granted_by ON user_access(granted_by);
CREATE INDEX idx_user_access_expiry_date ON user_access(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_user_access_last_used ON user_access(last_used_date);
CREATE INDEX idx_user_access_risk_score ON user_access(risk_score);
CREATE INDEX idx_user_access_grant_date ON user_access(grant_date);

-- Index for finding dormant accounts (not used in >90 days)
CREATE INDEX idx_user_access_dormant ON user_access(user_id, last_used_date) 
    WHERE is_active = true AND (last_used_date IS NULL OR last_used_date < CURRENT_DATE - INTERVAL '90 days');

-- ============================================
-- SOD RULES & VIOLATIONS
-- ============================================

CREATE INDEX idx_sod_rules_organization_id ON sod_rules(organization_id);
CREATE INDEX idx_sod_rules_template_id ON sod_rules(template_id);
CREATE INDEX idx_sod_rules_active ON sod_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_sod_rules_severity ON sod_rules(severity);
CREATE INDEX idx_sod_rules_process_area ON sod_rules(process_area);
CREATE INDEX idx_sod_rules_app_ids ON sod_rules USING gin(application_ids);

CREATE INDEX idx_sod_violations_rule_id ON sod_violations(rule_id);
CREATE INDEX idx_sod_violations_user_id ON sod_violations(user_id);
CREATE INDEX idx_sod_violations_user_rule ON sod_violations(user_id, rule_id);
CREATE INDEX idx_sod_violations_resolved ON sod_violations(is_resolved);
CREATE INDEX idx_sod_violations_detected_at ON sod_violations(detected_at);
CREATE INDEX idx_sod_violations_unresolved ON sod_violations(user_id, is_resolved) WHERE is_resolved = false;

-- ============================================
-- CAMPAIGNS & REVIEWS
-- ============================================

CREATE INDEX idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX idx_campaigns_org_status ON campaigns(organization_id, status);
CREATE INDEX idx_campaigns_date_range ON campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_active ON campaigns(status) WHERE status = 'active';

CREATE INDEX idx_campaign_reviewers_campaign_id ON campaign_reviewers(campaign_id);
CREATE INDEX idx_campaign_reviewers_reviewer_id ON campaign_reviewers(reviewer_id);
CREATE INDEX idx_campaign_reviewers_backup ON campaign_reviewers(backup_reviewer_id);
CREATE INDEX idx_campaign_reviewers_active ON campaign_reviewers(reviewer_id, is_active) WHERE is_active = true;

CREATE INDEX idx_review_items_campaign_id ON review_items(campaign_id);
CREATE INDEX idx_review_items_user_id ON review_items(user_id);
CREATE INDEX idx_review_items_application_id ON review_items(application_id);
CREATE INDEX idx_review_items_role_id ON review_items(role_id);
CREATE INDEX idx_review_items_reviewer_id ON review_items(reviewer_id);
CREATE INDEX idx_review_items_access_id ON review_items(access_id);
CREATE INDEX idx_review_items_decision ON review_items(decision);
CREATE INDEX idx_review_items_flagged ON review_items(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_review_items_pending ON review_items(campaign_id, reviewer_id, decision) WHERE decision = 'pending';
CREATE INDEX idx_review_items_campaign_decision ON review_items(campaign_id, decision);
CREATE INDEX idx_review_items_remediation_status ON review_items(remediation_status);
CREATE INDEX idx_review_items_delegated_to ON review_items(delegated_to);

CREATE INDEX idx_review_comments_review_item_id ON review_comments(review_item_id);
CREATE INDEX idx_review_comments_user_id ON review_comments(user_id);
CREATE INDEX idx_review_comments_created_at ON review_comments(created_at);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE INDEX idx_notification_templates_org_id ON notification_templates(organization_id);
CREATE INDEX idx_notification_templates_type ON notification_templates(template_type);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active) WHERE is_active = true;

CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_template_id ON notifications(template_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_pending ON notifications(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);

-- ============================================
-- CONNECTORS & SYNC
-- ============================================

CREATE INDEX idx_connector_configs_application_id ON connector_configs(application_id);
CREATE INDEX idx_connector_configs_connector_type ON connector_configs(connector_type);
CREATE INDEX idx_connector_configs_enabled ON connector_configs(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX idx_connector_configs_health ON connector_configs(health_status);

CREATE INDEX idx_sync_logs_connector_config_id ON sync_logs(connector_config_id);
CREATE INDEX idx_sync_logs_started_at ON sync_logs(started_at);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_connector_status ON sync_logs(connector_config_id, started_at DESC);

-- ============================================
-- AUDIT & COMPLIANCE
-- ============================================

CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX idx_compliance_reports_organization_id ON compliance_reports(organization_id);
CREATE INDEX idx_compliance_reports_campaign_id ON compliance_reports(campaign_id);
CREATE INDEX idx_compliance_reports_generated_by ON compliance_reports(generated_by);
CREATE INDEX idx_compliance_reports_report_type ON compliance_reports(report_type);
CREATE INDEX idx_compliance_reports_created_at ON compliance_reports(created_at DESC);
CREATE INDEX idx_compliance_reports_official ON compliance_reports(is_official) WHERE is_official = true;
CREATE INDEX idx_compliance_reports_period ON compliance_reports(report_period_start, report_period_end);

-- ============================================
-- RISK & ANALYTICS
-- ============================================

CREATE INDEX idx_risk_profiles_user_id ON risk_profiles(user_id);
CREATE INDEX idx_risk_profiles_overall_score ON risk_profiles(overall_risk_score DESC);
CREATE INDEX idx_risk_profiles_high_risk ON risk_profiles(overall_risk_score) WHERE overall_risk_score >= 70;
CREATE INDEX idx_risk_profiles_dormant ON risk_profiles(dormant_account_flag) WHERE dormant_account_flag = true;
CREATE INDEX idx_risk_profiles_sod_violations ON risk_profiles(sod_violation_count) WHERE sod_violation_count > 0;
CREATE INDEX idx_risk_profiles_next_review ON risk_profiles(next_review_date);

CREATE INDEX idx_access_analytics_organization_id ON access_analytics(organization_id);
CREATE INDEX idx_access_analytics_metric_date ON access_analytics(metric_date DESC);
CREATE INDEX idx_access_analytics_org_date ON access_analytics(organization_id, metric_date DESC);

-- ============================================
-- CONFIGURATION
-- ============================================

CREATE INDEX idx_system_config_organization_id ON system_config(organization_id);
CREATE INDEX idx_system_config_key ON system_config(config_key);
CREATE INDEX idx_system_config_org_key ON system_config(organization_id, config_key);
CREATE INDEX idx_system_config_system_level ON system_config(is_system_level) WHERE is_system_level = true;

CREATE INDEX idx_feature_flags_organization_id ON feature_flags(organization_id);
CREATE INDEX idx_feature_flags_feature_name ON feature_flags(feature_name);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_feature_flags_allowed_users ON feature_flags USING gin(allowed_users);

-- ============================================
-- JSONB Indexes for Performance
-- ============================================

-- Index on JSONB fields for common queries
CREATE INDEX idx_applications_connector_config ON applications USING gin(connector_config);
CREATE INDEX idx_roles_permissions ON roles USING gin(permissions);
CREATE INDEX idx_user_access_metadata ON user_access USING gin(metadata);
CREATE INDEX idx_sod_rules_conflicting_roles ON sod_rules USING gin(conflicting_roles);
CREATE INDEX idx_sod_violations_details ON sod_violations USING gin(violation_details);
CREATE INDEX idx_campaigns_scope_config ON campaigns USING gin(scope_config);
CREATE INDEX idx_review_items_access_details ON review_items USING gin(access_details);
CREATE INDEX idx_review_items_risk_indicators ON review_items USING gin(risk_indicators);
CREATE INDEX idx_audit_logs_old_values ON audit_logs USING gin(old_values);
CREATE INDEX idx_audit_logs_new_values ON audit_logs USING gin(new_values);
CREATE INDEX idx_compliance_reports_data ON compliance_reports USING gin(report_data);

COMMENT ON INDEX idx_user_access_dormant IS 'Optimizes queries for finding dormant/unused accounts';
COMMENT ON INDEX idx_review_items_pending IS 'Optimizes reviewer dashboard queries for pending items';
COMMENT ON INDEX idx_notifications_pending IS 'Optimizes notification queue processing';