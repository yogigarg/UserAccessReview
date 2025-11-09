#!/bin/bash

# =====================================================
# Database Setup Script
# User Access Review Application
# =====================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="uar_app"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}User Access Review - Database Setup${NC}"
echo -e "${GREEN}=========================================${NC}"

# Function to check if PostgreSQL is running
check_postgres() {
    echo -e "${YELLOW}Checking PostgreSQL connection...${NC}"
    if pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
        return 0
    else
        echo -e "${RED}✗ PostgreSQL is not running or not accessible${NC}"
        echo "Please start PostgreSQL and try again."
        exit 1
    fi
}

# Function to execute SQL file
execute_sql() {
    local file=$1
    local description=$2
    
    echo -e "${YELLOW}Executing: $description${NC}"
    
    if [ -f "$file" ]; then
        if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -f "$file" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $description completed${NC}"
        else
            echo -e "${RED}✗ Error executing $description${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ File not found: $file${NC}"
        exit 1
    fi
}

# Prompt for password
echo -e "${YELLOW}Enter PostgreSQL password for user '$DB_USER':${NC}"
read -s DB_PASSWORD
export PGPASSWORD=$DB_PASSWORD

# Check PostgreSQL connection
check_postgres

echo ""
echo -e "${YELLOW}=========================================${NC}"
echo -e "${YELLOW}Starting database setup...${NC}"
echo -e "${YELLOW}=========================================${NC}"
echo ""

# Execute setup scripts in order
execute_sql "00_setup.sql" "Database creation and extensions"
echo ""

execute_sql "01_schema.sql" "Schema creation (tables and types)"
echo ""

execute_sql "02_seed_data.sql" "Seed data insertion"
echo ""

execute_sql "03_indexes.sql" "Index creation"
echo ""

execute_sql "04_stored_procedures.sql" "Stored procedures and functions"
echo ""

# Verify installation
echo -e "${YELLOW}=========================================${NC}"
echo -e "${YELLOW}Verifying installation...${NC}"
echo -e "${YELLOW}=========================================${NC}"

PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

echo ""
echo -e "${YELLOW}Database statistics:${NC}"
$PSQL_CMD -c "
SELECT 
    'Tables' as type, 
    COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    'Views' as type, 
    COUNT(*) as count 
FROM information_schema.views 
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'Functions' as type, 
    COUNT(*) as count 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
UNION ALL
SELECT 
    'Indexes' as type, 
    COUNT(*) as count 
FROM pg_indexes 
WHERE schemaname = 'public';
"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Database setup completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${GREEN}Database Name: $DB_NAME${NC}"
echo -e "${GREEN}Default Admin: admin@acme.com${NC}"
echo -e "${GREEN}Default Password: Admin@123${NC}"
echo ""
echo -e "${YELLOW}Sample accounts for testing:${NC}"
echo "  - Compliance Manager: jane.smith@acme.com / Admin@123"
echo "  - IT Manager: john.doe@acme.com / Admin@123"
echo "  - Finance Manager: sarah.johnson@acme.com / Admin@123"
echo ""
echo -e "${YELLOW}Connection string for application:${NC}"
echo "  postgresql://$DB_USER:[password]@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""

unset PGPASSWORD
````

---
