-- =====================================================
-- Stored Procedures & Functions
-- User Access Review Application
-- =====================================================

-- ============================================
-- AUDIT LOGGING FUNCTION
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON %I 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column()',
            t, t);
    END LOOP;
END;
$$;

-- ============================================
-- CAMPAIGN STATISTICS FUNCTIONS
-- ============================================

-- Function to recalculate campaign statistics
CREATE OR REPLACE FUNCTION recalculate_campaign_stats(campaign_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE campaigns
    SET 
        total_reviews = (
            SELECT COUNT(*) 
            FROM review_items 
            WHERE campaign_id = campaign_uuid
        ),
        completed_reviews = (
            SELECT COUNT(*) 
            FROM review_items 
            WHERE campaign_id = campaign_uuid 
            AND decision != 'pending'
        ),
        approved_count = (
            SELECT COUNT(*) 
            FROM review_items 
            WHERE campaign_id = campaign_uuid 
            AND decision = 'approved'
        ),
        revoked_count = (
            SELECT COUNT(*) 
            FROM review_items 
            WHERE campaign_id = campaign_uuid 
            AND decision = 'revoked'
        ),
        exception_count = (
            SELECT COUNT(*) 
            FROM review_items 
            WHERE campaign_id = campaign_uuid 
            AND decision = 'exception'
        ),
        completion_percentage = CASE 
            WHEN (SELECT COUNT(*) FROM review_items WHERE campaign_id = campaign_uuid) > 0
            THEN (
                SELECT COUNT(*) * 100.0 / 
                (SELECT COUNT(*) FROM review_items WHERE campaign_id = campaign_uuid)
                FROM review_items 
                WHERE campaign_id = campaign_uuid 
                AND decision != 'pending'
            )
            ELSE 0
        END
    WHERE id = campaign_uuid;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update campaign stats when review decision changes
CREATE OR REPLACE FUNCTION update_campaign_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM recalculate_campaign_stats(NEW.campaign_id);
    
    -- Also update reviewer stats
    UPDATE campaign_reviewers
    SET 
        completed_count = (
            SELECT COUNT(*) 
            FROM review_items 
            WHERE campaign_id = NEW.campaign_id 
            AND reviewer_id = NEW.reviewer_id 
            AND decision != 'pending'
        )
    WHERE campaign_id = NEW.campaign_id 
    AND reviewer_id = NEW.reviewer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_item_stats
AFTER UPDATE OF decision ON review_items
FOR EACH ROW
EXECUTE FUNCTION update_campaign_stats_trigger();

-- ============================================
-- SOD VIOLATION DETECTION
-- ============================================

-- Function to detect SOD violations for a user
CREATE OR REPLACE FUNCTION detect_sod_violations(user_uuid UUID)
RETURNS TABLE(
    rule_id UUID,
    rule_name VARCHAR,
    severity sod_severity,
    conflicting_roles JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        r.id,
        r.name,
        r.severity,
        r.conflicting_roles
    FROM sod_rules r
    WHERE r.is_active = true
    AND EXISTS (
        -- Check if user has multiple conflicting roles from this rule
        SELECT 1
        FROM user_access ua
        JOIN roles ro ON ro.id = ua.role_id
        WHERE ua.user_id = user_uuid
        AND ua.is_active = true
        AND ro.application_id = ANY(r.application_ids)
        AND ro.code = ANY(
            SELECT jsonb_array_elements_text(r.conflicting_roles->'role_code')
        )
        GROUP BY ua.user_id
        HAVING COUNT(DISTINCT ro.code) >= 2
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check and log SOD violations after access changes
CREATE OR REPLACE FUNCTION check_sod_violations_on_access()
RETURNS TRIGGER AS $$
DECLARE
    violation_record RECORD;
    violation_exists BOOLEAN;
BEGIN
    -- Only check for active access
    IF NEW.is_active = true THEN
        FOR violation_record IN 
            SELECT * FROM detect_sod_violations(NEW.user_id)
        LOOP
            -- Check if violation already logged
            SELECT EXISTS(
                SELECT 1 FROM sod_violations 
                WHERE user_id = NEW.user_id 
                AND rule_id = violation_record.rule_id 
                AND is_resolved = false
            ) INTO violation_exists;
            
            -- Insert new violation if not exists
            IF NOT violation_exists THEN
                INSERT INTO sod_violations (rule_id, user_id, violation_details, detected_at, is_resolved)
                VALUES (
                    violation_record.rule_id,
                    NEW.user_id,
                    jsonb_build_object(
                        'user_id', NEW.user_id,
                        'detected_at', CURRENT_TIMESTAMP,
                        'access_id', NEW.id,
                        'conflicting_roles', violation_record.conflicting_roles
                    ),
                    CURRENT_TIMESTAMP,
                    false
                );
                
                -- Update rule violation count
                UPDATE sod_rules 
                SET violation_count = violation_count + 1,
                    last_evaluated_at = CURRENT_TIMESTAMP
                WHERE id = violation_record.rule_id;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_sod_on_access_grant
AFTER INSERT OR UPDATE ON user_access
FOR EACH ROW
EXECUTE FUNCTION check_sod_violations_on_access();

-- ============================================
-- RISK SCORING FUNCTIONS
-- ============================================

-- Function to calculate user risk score
CREATE OR REPLACE FUNCTION calculate_user_risk_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    risk_score INTEGER := 0;
    privileged_count INTEGER;
    sod_count INTEGER;
    dormant_days INTEGER;
    excessive_access INTEGER;
BEGIN
    -- Count privileged access
    SELECT COUNT(*) INTO privileged_count
    FROM user_access ua
    JOIN roles r ON r.id = ua.role_id
    WHERE ua.user_id = user_uuid
    AND ua.is_active = true
    AND r.risk_level IN ('critical', 'high');
    
    -- Count SOD violations
    SELECT COUNT(*) INTO sod_count
    FROM sod_violations
    WHERE user_id = user_uuid
    AND is_resolved = false;
    
    -- Check dormant account (no access used in 90+ days)
    SELECT EXTRACT(DAY FROM CURRENT_DATE - MAX(last_used_date)) INTO dormant_days
    FROM user_access
    WHERE user_id = user_uuid
    AND is_active = true;
    
    -- Count total access items (excessive access indicator)
    SELECT COUNT(*) INTO excessive_access
    FROM user_access
    WHERE user_id = user_uuid
    AND is_active = true;
    
    -- Calculate risk score (0-100)
    risk_score := LEAST(100, 
        (privileged_count * 15) +  -- Up to 15 points per privileged access
        (sod_count * 30) +          -- Up to 30 points per SOD violation
        CASE 
            WHEN dormant_days > 180 THEN 25
            WHEN dormant_days > 90 THEN 15
            ELSE 0 
        END +
        CASE 
            WHEN excessive_access > 20 THEN 20
            WHEN excessive_access > 10 THEN 10
            ELSE 0 
        END
    );
    
    RETURN risk_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update risk profiles
CREATE OR REPLACE FUNCTION update_risk_profile(user_uuid UUID)
RETURNS void AS $$
DECLARE
    overall_score INTEGER;
    priv_count INTEGER;
    sod_count INTEGER;
    is_dormant BOOLEAN;
    has_excessive BOOLEAN;
BEGIN
    overall_score := calculate_user_risk_score(user_uuid);
    
    SELECT COUNT(*) INTO priv_count
    FROM user_access ua
    JOIN roles r ON r.id = ua.role_id
    WHERE ua.user_id = user_uuid
    AND ua.is_active = true
    AND r.risk_level IN ('critical', 'high');
    
    SELECT COUNT(*) INTO sod_count
    FROM sod_violations
    WHERE user_id = user_uuid
    AND is_resolved = false;
    
    SELECT EXISTS(
        SELECT 1 FROM user_access
        WHERE user_id = user_uuid
        AND is_active = true
        AND (last_used_date IS NULL OR last_used_date < CURRENT_DATE - INTERVAL '90 days')
    ) INTO is_dormant;
    
    SELECT COUNT(*) > 20 INTO has_excessive
    FROM user_access
    WHERE user_id = user_uuid
    AND is_active = true;
    
    INSERT INTO risk_profiles (
        user_id, overall_risk_score, privileged_access_count, 
        sod_violation_count, dormant_account_flag, excessive_access_flag,
        last_calculated_at, next_review_date
    )
    VALUES (
        user_uuid, overall_score, priv_count, sod_count, 
        is_dormant, has_excessive,
        CURRENT_TIMESTAMP, CURRENT_DATE + INTERVAL '90 days'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        overall_risk_score = EXCLUDED.overall_risk_score,
        privileged_access_count = EXCLUDED.privileged_access_count,
        sod_violation_count = EXCLUDED.sod_violation_count,
        dormant_account_flag = EXCLUDED.dormant_account_flag,
        excessive_access_flag = EXCLUDED.excessive_access_flag,
        last_calculated_at = EXCLUDED.last_calculated_at,
        next_review_date = EXCLUDED.next_review_date,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ACCESS ANALYTICS FUNCTIONS
-- ============================================

-- Function to generate daily access analytics
CREATE OR REPLACE FUNCTION generate_daily_analytics(org_uuid UUID, metric_date_param DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO access_analytics (
        organization_id, metric_date, total_users, active_users,
        total_access_items, high_risk_access_count, sod_violations_count,
        dormant_accounts_count, privileged_accounts_count
    )
    SELECT
        org_uuid,
        metric_date_param,
        (SELECT COUNT(*) FROM users WHERE organization_id = org_uuid AND status = 'active'),
        (SELECT COUNT(DISTINCT user_id) FROM user_access ua 
         JOIN users u ON u.id = ua.user_id 
         WHERE u.organization_id = org_uuid AND ua.is_active = true),
        (SELECT COUNT(*) FROM user_access ua 
         JOIN users u ON u.id = ua.user_id 
         WHERE u.organization_id = org_uuid AND ua.is_active = true),
        (SELECT COUNT(*) FROM user_access ua 
         JOIN users u ON u.id = ua.user_id 
         JOIN roles r ON r.id = ua.role_id
         WHERE u.organization_id = org_uuid AND ua.is_active = true 
         AND r.risk_level IN ('critical', 'high')),
        (SELECT COUNT(*) FROM sod_violations sv 
         JOIN users u ON u.id = sv.user_id 
         WHERE u.organization_id = org_uuid AND sv.is_resolved = false),
        (SELECT COUNT(DISTINCT ua.user_id) FROM user_access ua 
         JOIN users u ON u.id = ua.user_id 
         WHERE u.organization_id = org_uuid AND ua.is_active = true
         AND (ua.last_used_date IS NULL OR ua.last_used_date < metric_date_param - INTERVAL '90 days')),
        (SELECT COUNT(DISTINCT ua.user_id) FROM user_access ua 
         JOIN users u ON u.id = ua.user_id 
         JOIN roles r ON r.id = ua.role_id
         WHERE u.organization_id = org_uuid AND ua.is_active = true 
         AND r.risk_level IN ('critical, 'high'))
ON CONFLICT (organization_id, metric_date) DO UPDATE SET
total_users = EXCLUDED.total_users,
active_users = EXCLUDED.active_users,
total_access_items = EXCLUDED.total_access_items,
high_risk_access_count = EXCLUDED.high_risk_access_count,
sod_violations_count = EXCLUDED.sod_violations_count,
dormant_accounts_count = EXCLUDED.dormant_accounts_count,
privileged_accounts_count = EXCLUDED.privileged_accounts_count;
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- HELPER FUNCTIONS
-- ============================================
-- Function to get user's direct reports
CREATE OR REPLACE FUNCTION get_direct_reports(manager_uuid UUID)
RETURNS TABLE(
user_id UUID,
full_name VARCHAR,
email VARCHAR,
department VARCHAR,
job_title VARCHAR
) AS $$
BEGIN
RETURN QUERY
SELECT
u.id,
u.first_name || ' ' || u.last_name,
u.email,
d.name,
u.job_title
FROM users u
LEFT JOIN departments d ON d.id = u.department_id
WHERE u.manager_id = manager_uuid
AND u.status = 'active'
ORDER BY u.last_name, u.first_name;
END;
$$ LANGUAGE plpgsql;
-- Function to get user's access summary
CREATE OR REPLACE FUNCTION get_user_access_summary(user_uuid UUID)
RETURNS TABLE(
total_access INTEGER,
high_risk_access INTEGER,
dormant_access INTEGER,
sod_violations INTEGER,
applications_count INTEGER,
last_review_date DATE
) AS $$
BEGIN
RETURN QUERY
SELECT
COUNT()::INTEGER,
COUNT() FILTER (WHERE r.risk_level IN ('critical', 'high'))::INTEGER,
COUNT() FILTER (WHERE ua.last_used_date IS NULL OR ua.last_used_date < CURRENT_DATE - INTERVAL '90 days')::INTEGER,
(SELECT COUNT()::INTEGER FROM sod_violations WHERE user_id = user_uuid AND is_resolved = false),
COUNT(DISTINCT ua.application_id)::INTEGER,
MAX(ri.decision_date)::DATE
FROM user_access ua
LEFT JOIN roles r ON r.id = ua.role_id
LEFT JOIN review_items ri ON ri.user_id = user_uuid AND ri.decision != 'pending'
WHERE ua.user_id = user_uuid
AND ua.is_active = true;
END;
$$ LANGUAGE plpgsql;
-- Function to check if user can review another user's access
CREATE OR REPLACE FUNCTION can_review_user(reviewer_uuid UUID, target_user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
is_manager BOOLEAN;
is_admin BOOLEAN;
is_compliance BOOLEAN;
BEGIN
-- Check if reviewer is admin or compliance manager
SELECT
role IN ('admin', 'compliance_manager') INTO is_admin
FROM users
WHERE id = reviewer_uuid;
IF is_admin THEN
    RETURN TRUE;
END IF;

-- Check if reviewer is the user's manager
SELECT EXISTS(
    SELECT 1 FROM users
    WHERE id = target_user_uuid
    AND manager_id = reviewer_uuid
) INTO is_manager;

RETURN is_manager;
END;
$$ LANGUAGE plpgsql;
-- Function to get pending reviews for a reviewer
CREATE OR REPLACE FUNCTION get_pending_reviews(reviewer_uuid UUID)
RETURNS TABLE(
review_item_id UUID,
campaign_name VARCHAR,
user_name VARCHAR,
application_name VARCHAR,
role_name VARCHAR,
is_flagged BOOLEAN,
flag_reason TEXT,
days_remaining INTEGER
) AS $$
BEGIN
RETURN QUERY
SELECT
ri.id,
c.name,
u.first_name || ' ' || u.last_name,
a.name,
r.name,
ri.is_flagged,
ri.flag_reason,
(c.end_date - CURRENT_DATE)::INTEGER
FROM review_items ri
JOIN campaigns c ON c.id = ri.campaign_id
JOIN users u ON u.id = ri.user_id
JOIN applications a ON a.id = ri.application_id
LEFT JOIN roles r ON r.id = ri.role_id
WHERE ri.reviewer_id = reviewer_uuid
AND ri.decision = 'pending'
AND c.status = 'active'
ORDER BY ri.is_flagged DESC, c.end_date ASC;
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================
-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
deleted_count INTEGER;
BEGIN
DELETE FROM user_sessions
WHERE expires_at < CURRENT_TIMESTAMP;
GET DIAGNOSTICS deleted_count = ROW_COUNT;
RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
-- Function to archive old campaigns
CREATE OR REPLACE FUNCTION archive_completed_campaigns(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
archived_count INTEGER;
BEGIN
-- This would typically move data to an archive table
-- For now, just mark campaigns as archived in metadata
UPDATE campaigns
SET metadata = metadata || '{"archived": true, "archived_at": "' || CURRENT_TIMESTAMP || '"}'::jsonb
WHERE status = 'completed'
AND completed_at < CURRENT_TIMESTAMP - (days_old || ' days')::INTERVAL
AND NOT (metadata->>'archived')::BOOLEAN IS TRUE;
GET DIAGNOSTICS archived_count = ROW_COUNT;
RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
-- Function to delete old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
deleted_count INTEGER;
BEGIN
DELETE FROM notifications
WHERE status = 'sent'
AND sent_at < CURRENT_TIMESTAMP - (days_old || ' days')::INTERVAL;
GET DIAGNOSTICS deleted_count = ROW_COUNT;
RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- REPORTING FUNCTIONS
-- ============================================
-- Function to generate campaign summary report
CREATE OR REPLACE FUNCTION generate_campaign_report(campaign_uuid UUID)
RETURNS JSONB AS $$
DECLARE
report_data JSONB;
BEGIN
SELECT jsonb_build_object(
'campaign_id', c.id,
'campaign_name', c.name,
'campaign_type', c.campaign_type,
'status', c.status,
'period', jsonb_build_object(
'start_date', c.start_date,
'end_date', c.end_date
),
'statistics', jsonb_build_object(
'total_reviews', c.total_reviews,
'completed_reviews', c.completed_reviews,
'completion_percentage', c.completion_percentage,
'approved_count', c.approved_count,
'revoked_count', c.revoked_count,
'exception_count', c.exception_count
),
'reviewers', (
SELECT jsonb_agg(jsonb_build_object(
'reviewer_name', u.first_name || ' ' || u.last_name,
'total_assigned', cr.total_assigned,
'completed', cr.completed_count,
'completion_rate', CASE
WHEN cr.total_assigned > 0
THEN ROUND((cr.completed_count::NUMERIC / cr.total_assigned) * 100, 2)
ELSE 0
END
))
FROM campaign_reviewers cr
JOIN users u ON u.id = cr.reviewer_id
WHERE cr.campaign_id = c.id
),
'violations_found', (
SELECT COUNT(DISTINCT sv.id)
FROM sod_violations sv
JOIN review_items ri ON ri.user_id = sv.user_id
WHERE ri.campaign_id = c.id
AND sv.detected_at BETWEEN c.start_date AND COALESCE(c.completed_at, CURRENT_TIMESTAMP)
),
'high_risk_items', (
SELECT COUNT(*)
FROM review_items
WHERE campaign_id = c.id
AND is_flagged = true
)
) INTO report_data
FROM campaigns c
WHERE c.id = campaign_uuid;
RETURN report_data;
END;
$$ LANGUAGE plpgsql;
-- Function to get SOD violations report
CREATE OR REPLACE FUNCTION get_sod_violations_report(org_uuid UUID)
RETURNS TABLE(
rule_name VARCHAR,
severity sod_severity,
total_violations BIGINT,
unresolved_violations BIGINT,
users_affected BIGINT
) AS $$
BEGIN
RETURN QUERY
SELECT
r.name,
r.severity,
COUNT()::BIGINT,
COUNT() FILTER (WHERE sv.is_resolved = false)::BIGINT,
COUNT(DISTINCT sv.user_id)::BIGINT
FROM sod_rules r
LEFT JOIN sod_violations sv ON sv.rule_id = r.id
WHERE r.organization_id = org_uuid
AND r.is_active = true
GROUP BY r.id, r.name, r.severity
ORDER BY r.severity DESC, COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;
-- Function to get dormant accounts report
CREATE OR REPLACE FUNCTION get_dormant_accounts_report(org_uuid UUID, days_inactive INTEGER DEFAULT 90)
RETURNS TABLE(
user_id UUID,
employee_id VARCHAR,
full_name VARCHAR,
email VARCHAR,
department VARCHAR,
last_used_date DATE,
days_inactive INTEGER,
access_count BIGINT,
high_risk_access_count BIGINT
) AS $$
BEGIN
RETURN QUERY
SELECT
u.id,
u.employee_id,
u.first_name || ' ' || u.last_name,
u.email,
d.name,
MAX(ua.last_used_date)::DATE,
(CURRENT_DATE - MAX(ua.last_used_date))::INTEGER,
COUNT()::BIGINT,
COUNT() FILTER (WHERE r.risk_level IN ('critical', 'high'))::BIGINT
FROM users u
LEFT JOIN departments d ON d.id = u.department_id
JOIN user_access ua ON ua.user_id = u.id
LEFT JOIN roles r ON r.id = ua.role_id
WHERE u.organization_id = org_uuid
AND u.status = 'active'
AND ua.is_active = true
GROUP BY u.id, u.employee_id, u.first_name, u.last_name, u.email, d.name
HAVING MAX(ua.last_used_date) < CURRENT_DATE - days_inactive
OR MAX(ua.last_used_date) IS NULL
ORDER BY MAX(ua.last_used_date) NULLS FIRST;
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================
-- View for active user access with details
CREATE OR REPLACE VIEW v_active_user_access AS
SELECT
ua.id AS access_id,
u.id AS user_id,
u.employee_id,
u.first_name || ' ' || u.last_name AS user_name,
u.email,
u.department_id,
d.name AS department_name,
u.manager_id,
m.first_name || ' ' || m.last_name AS manager_name,
a.id AS application_id,
a.name AS application_name,
a.code AS application_code,
a.business_criticality,
r.id AS role_id,
r.name AS role_name,
r.code AS role_code,
r.risk_level,
ua.access_type,
ua.grant_date,
ua.expiry_date,
ua.last_used_date,
ua.business_justification,
ua.risk_score,
CASE
WHEN ua.last_used_date IS NULL THEN 'Never Used'
WHEN ua.last_used_date < CURRENT_DATE - INTERVAL '90 days' THEN 'Dormant'
WHEN ua.last_used_date < CURRENT_DATE - INTERVAL '30 days' THEN 'Inactive'
ELSE 'Active'
END AS usage_status,
ua.created_at,
ua.updated_at
FROM user_access ua
JOIN users u ON u.id = ua.user_id
LEFT JOIN departments d ON d.id = u.department_id
LEFT JOIN users m ON m.id = u.manager_id
JOIN applications a ON a.id = ua.application_id
LEFT JOIN roles r ON r.id = ua.role_id
WHERE ua.is_active = true
AND u.status = 'active';
-- View for pending reviews
CREATE OR REPLACE VIEW v_pending_reviews AS
SELECT
ri.id AS review_item_id,
c.id AS campaign_id,
c.name AS campaign_name,
c.end_date AS campaign_end_date,
(c.end_date - CURRENT_DATE) AS days_remaining,
ri.reviewer_id,
reviewer.first_name || ' ' || reviewer.last_name AS reviewer_name,
ri.user_id,
u.employee_id,
u.first_name || ' ' || u.last_name AS user_name,
u.email AS user_email,
d.name AS department_name,
ri.application_id,
a.name AS application_name,
ri.role_id,
r.name AS role_name,
r.risk_level,
ri.is_flagged,
ri.flag_reason,
ri.access_details,
ri.created_at
FROM review_items ri
JOIN campaigns c ON c.id = ri.campaign_id
JOIN users reviewer ON reviewer.id = ri.reviewer_id
JOIN users u ON u.id = ri.user_id
LEFT JOIN departments d ON d.id = u.department_id
JOIN applications a ON a.id = ri.application_id
LEFT JOIN roles r ON r.id = ri.role_id
WHERE ri.decision = 'pending'
AND c.status = 'active';
-- View for SOD violations with details
CREATE OR REPLACE VIEW v_sod_violations_detail AS
SELECT
sv.id AS violation_id,
sv.detected_at,
sv.is_resolved,
sv.resolved_at,
r.id AS rule_id,
r.name AS rule_name,
r.severity,
r.process_area,
u.id AS user_id,
u.employee_id,
u.first_name || ' ' || u.last_name AS user_name,
u.email,
u.department_id,
d.name AS department_name,
sv.violation_details,
sv.resolution_action,
sv.resolution_notes,
resolver.first_name || ' ' || resolver.last_name AS resolved_by_name
FROM sod_violations sv
JOIN sod_rules r ON r.id = sv.rule_id
JOIN users u ON u.id = sv.user_id
LEFT JOIN departments d ON d.id = u.department_id
LEFT JOIN users resolver ON resolver.id = sv.resolved_by;
-- View for campaign progress
CREATE OR REPLACE VIEW v_campaign_progress AS
SELECT
c.id AS campaign_id,
c.name AS campaign_name,
c.campaign_type,
c.status,
c.start_date,
c.end_date,
CURRENT_DATE - c.start_date AS days_elapsed,
c.end_date - CURRENT_DATE AS days_remaining,
c.total_reviews,
c.completed_reviews,
c.completion_percentage,
c.approved_count,
c.revoked_count,
c.exception_count,
creator.first_name || ' ' || creator.last_name AS created_by_name,
(
SELECT COUNT()
FROM campaign_reviewers
WHERE campaign_id = c.id AND is_active = true
) AS active_reviewers,
(
SELECT COUNT()
FROM review_items ri
WHERE ri.campaign_id = c.id AND ri.is_flagged = true
) AS flagged_items
FROM campaigns c
JOIN users creator ON creator.id = c.created_by;
-- ============================================
-- MAINTENANCE PROCEDURES
-- ============================================
-- Procedure to run daily maintenance tasks
CREATE OR REPLACE FUNCTION run_daily_maintenance()
RETURNS TEXT AS $$
DECLARE
result TEXT := '';
sessions_cleaned INTEGER;
notifications_cleaned INTEGER;
BEGIN
-- Cleanup expired sessions
sessions_cleaned := cleanup_expired_sessions();
result := result || 'Cleaned ' || sessions_cleaned || ' expired sessions. ';
-- Cleanup old notifications
notifications_cleaned := cleanup_old_notifications(30);
result := result || 'Cleaned ' || notifications_cleaned || ' old notifications. ';

-- Generate analytics for yesterday
PERFORM generate_daily_analytics(
    org.id, 
    CURRENT_DATE - INTERVAL '1 day'
)
FROM organizations org WHERE org.is_active = true;
result := result || 'Generated analytics for all organizations. ';

-- Update risk profiles for users with recent access changes
PERFORM update_risk_profile(ua.user_id)
FROM (
    SELECT DISTINCT user_id 
    FROM user_access 
    WHERE updated_at > CURRENT_DATE - INTERVAL '1 day'
) ua;
result := result || 'Updated risk profiles. ';

RETURN result;
END;
$$ LANGUAGE plpgsql;
-- ============================================
-- COMMENTS ON FUNCTIONS
-- ============================================
COMMENT ON FUNCTION recalculate_campaign_stats IS 'Recalculates all statistics for a campaign based on review items';
COMMENT ON FUNCTION detect_sod_violations IS 'Detects SOD rule violations for a specific user';
COMMENT ON FUNCTION calculate_user_risk_score IS 'Calculates a 0-100 risk score for a user based on access patterns';
COMMENT ON FUNCTION get_pending_reviews IS 'Returns all pending review items for a specific reviewer';
COMMENT ON FUNCTION generate_campaign_report IS 'Generates a comprehensive JSON report for a campaign';
COMMENT ON FUNCTION run_daily_maintenance IS 'Runs daily maintenance tasks including cleanup and analytics';
