-- Rollback Migration: Remove Organizations Tables
-- Created: 2025-05-24

-- First migrate any data we need to preserve
-- Move organization relationships back to workspace self-references
DO $$ 
BEGIN
    -- Only execute if the organizations table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        -- Check if workspaces.organization_id references organizations
        IF EXISTS (
            SELECT 1
            FROM information_schema.constraint_column_usage ccu
            JOIN information_schema.table_constraints tc ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'organizations'
            AND tc.table_name = 'workspaces'
            AND ccu.column_name = 'id'
        ) THEN
            -- Drop the foreign key constraint
            EXECUTE (
                SELECT format('ALTER TABLE workspaces DROP CONSTRAINT %I', constraint_name)
                FROM information_schema.table_constraints 
                WHERE table_name = 'workspaces'
                AND constraint_type = 'FOREIGN KEY'
                AND constraint_name IN (
                    SELECT tc.constraint_name 
                    FROM information_schema.constraint_column_usage ccu
                    JOIN information_schema.table_constraints tc ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND ccu.table_name = 'organizations'
                    AND tc.table_name = 'workspaces'
                    AND ccu.column_name = 'id'
                )
                LIMIT 1
            );
            
            -- Add self-referential constraint
            ALTER TABLE workspaces
            ADD CONSTRAINT fk_workspaces_organization_self_ref
            FOREIGN KEY (organization_id) REFERENCES workspaces(id);
        END IF;
    END IF;
END $$;

-- Drop indexes
DROP INDEX IF EXISTS idx_organization_members_organization_id;
DROP INDEX IF EXISTS idx_organization_members_user_id;
DROP INDEX IF EXISTS idx_workspaces_organization_id;

-- Drop triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;

-- Drop tables (in correct order to respect dependencies)
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organizations;

-- Revoke privileges (may fail silently if already dropped)
REVOKE ALL PRIVILEGES ON organizations FROM authenticated;
REVOKE ALL PRIVILEGES ON organization_members FROM authenticated;
