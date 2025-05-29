-- Migration: Add Organizations Tables
-- Created: 2025-05-24

-- Create Organizations Table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    owner_id UUID NOT NULL REFERENCES users(id),
    is_personal BOOLEAN DEFAULT FALSE,
    domain_restriction TEXT[], -- restrict signups to certain domains
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
    END IF;
END $$;

-- Create Organization Members Table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
        CREATE TABLE organization_members (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member, guest
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invitation_status VARCHAR(50) DEFAULT 'accepted', -- pending, accepted, rejected
    UNIQUE(organization_id, user_id)
);
    END IF;
END $$;

-- Update function for 'updated_at' if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $BODY$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $BODY$ LANGUAGE 'plpgsql';
    END IF;
END $$;

-- Add triggers for new tables
CREATE TRIGGER update_organizations_updated_at 
BEFORE UPDATE ON organizations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at 
BEFORE UPDATE ON organization_members 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for the new tables if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_members_organization_id') THEN
        CREATE INDEX idx_organization_members_organization_id ON organization_members(organization_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_members_user_id') THEN
        CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
    END IF;
END $$;

-- Add organization_id to workspaces table if it doesn't exist
DO $$ 
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'workspaces' AND column_name = 'organization_id') THEN
        -- Add the column
        ALTER TABLE workspaces ADD COLUMN organization_id UUID;
    END IF;
END $$;

-- Migrate existing data from workspaces used as organizations
DO $$ 
BEGIN
    -- Check if the uuid_generate_v4 function exists, create it if not
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uuid_generate_v4') THEN
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    END IF;
    
    -- Check if the column exists before running any operations on it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'workspaces' AND column_name = 'organization_id') THEN
        -- Only migrate if there are actual workspaces to migrate
        IF EXISTS (SELECT 1 FROM workspaces WHERE organization_id IS NULL) THEN
            -- Directly insert from workspaces without using a temp table
            INSERT INTO organizations (id, name, slug, description, logo_url, owner_id, is_personal, created_at, updated_at)
            SELECT id, name, slug, description, logo_url, owner_id, is_personal, created_at, updated_at
            FROM workspaces
            WHERE organization_id IS NULL; -- Top-level workspaces
            
            -- Migrate workspace members to organization members for these workspaces
            INSERT INTO organization_members (id, organization_id, user_id, role, joined_at)
            SELECT 
                uuid_generate_v4(), -- Generate new UUIDs for organization members
                wm.workspace_id,
                wm.user_id,
                wm.role,
                wm.joined_at
            FROM workspace_members wm
            JOIN workspaces w ON wm.workspace_id = w.id
            WHERE w.organization_id IS NULL;
        END IF;
    END IF;
END $$;

-- Update the foreign key constraint for organization_id in workspaces table
DO $$ 
BEGIN
    -- First check if the column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'workspaces' AND column_name = 'organization_id') THEN
        -- Check if workspaces.organization_id references workspaces
        IF EXISTS (
            SELECT 1
            FROM information_schema.constraint_column_usage ccu
            JOIN information_schema.table_constraints tc ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'workspaces'
            AND ccu.column_name = 'organization_id'
            AND tc.table_name = 'workspaces'
        ) THEN
            -- Drop existing foreign key constraint
            EXECUTE (
                SELECT format('ALTER TABLE workspaces DROP CONSTRAINT %I', constraint_name)
                FROM information_schema.table_constraints 
                WHERE table_name = 'workspaces'
                AND constraint_type = 'FOREIGN KEY'
                AND constraint_name IN (
                    SELECT constraint_name 
                    FROM information_schema.constraint_column_usage 
                    WHERE table_name = 'workspaces' 
                    AND column_name = 'organization_id'
                )
                LIMIT 1
            );
            
            -- Add new foreign key constraint
            ALTER TABLE workspaces
            ADD CONSTRAINT fk_workspaces_organization_id
            FOREIGN KEY (organization_id) REFERENCES organizations(id);
            
            -- Update workspaces to reference the new organizations
            UPDATE workspaces w
            SET organization_id = w.organization_id
            WHERE organization_id IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Create index for workspaces.organization_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workspaces_organization_id') THEN
        CREATE INDEX idx_workspaces_organization_id ON workspaces(organization_id);
    END IF;
END $$;

-- Grant appropriate permissions
GRANT ALL PRIVILEGES ON organizations TO authenticated;
GRANT ALL PRIVILEGES ON organization_members TO authenticated;
