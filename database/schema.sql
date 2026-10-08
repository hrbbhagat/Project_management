-- ==============================================================================
-- Project Management Database Schema
-- Dialect: PostgreSQL (13+)
-- ==============================================================================

-- 1. EXTENSIONS
-- pgcrypto provides cryptographic functions and gen_random_uuid() for UUID PKs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
-- Enums enforce strict domain values while being natively supported by modern ORMs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_system_role') THEN
        CREATE TYPE user_system_role AS ENUM ('ADMIN', 'MEMBER');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE project_status AS ENUM (
            'NOT_STARTED',
            'IN_PROGRESS',
            'COMPLETED',
            'PLANNING',
            'ACTIVE',
            'ON_HOLD',
            'ARCHIVED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_role') THEN
        CREATE TYPE project_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM (
            'PENDING',
            'IN_PROGRESS',
            'COMPLETED',
            'TODO',
            'IN_REVIEW',
            'DONE',
            'BLOCKED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    END IF;
END $$;

-- 3. TABLES

-- Table: users
-- Represents system users who can own projects, participate as members, be assigned tasks, or post comments.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(512),
    role user_system_role NOT NULL DEFAULT 'MEMBER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_users_full_name_not_empty CHECK (length(trim(full_name)) > 0)
);

-- Table: projects
-- Represents software projects/workspaces containing tasks and members.
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'NOT_STARTED',
    owner_id UUID NOT NULL,
    start_date DATE,
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign Keys
    -- ON DELETE RESTRICT: Do not allow deletion of a user if they own projects. Ownership must be transferred first.
    CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) 
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,

    -- Constraints
    CONSTRAINT chk_projects_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_projects_dates CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
);

-- Table: project_members
-- Junction table modeling the many-to-many relationship between users and projects, with role-based access.
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role project_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign Keys
    -- Cascade deletion: If a project or user is removed, membership records are cleanly removed.
    CONSTRAINT fk_project_members_project FOREIGN KEY (project_id) 
        REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_project_members_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,

    -- Constraints
    CONSTRAINT uq_project_members_project_user UNIQUE (project_id, user_id)
);

-- Table: tasks
-- Represents work items tracked within a project.
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'PENDING',
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    assigned_to UUID,
    created_by UUID NOT NULL,
    due_date TIMESTAMPTZ,
    estimated_hours NUMERIC(5, 2),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign Keys
    -- ON DELETE CASCADE: If a project is deleted, its tasks are deleted.
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) 
        REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
    -- ON DELETE SET NULL: If an assigned user is removed, the task remains intact as unassigned.
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assigned_to) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    -- ON DELETE RESTRICT: Preserves audit integrity of task creator.
    CONSTRAINT fk_tasks_creator FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,

    -- Constraints
    CONSTRAINT chk_tasks_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT chk_tasks_estimated_hours CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
    CONSTRAINT chk_tasks_completed_at CHECK (completed_at IS NULL OR completed_at >= created_at)
);

-- Table: comments
-- Threaded collaboration messages attached to specific tasks.
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    user_id UUID,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign Keys
    -- ON DELETE CASCADE: Deleting a task deletes all associated comments.
    CONSTRAINT fk_comments_task FOREIGN KEY (task_id) 
        REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
    -- ON DELETE SET NULL: If a user is deleted, comment content is preserved for team history with null author.
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,

    -- Constraints
    CONSTRAINT chk_comments_content_not_empty CHECK (length(trim(content)) > 0)
);

-- 4. TRIGGERS & FUNCTIONS

-- Function: update_updated_at_column
-- Automatically sets updated_at to NOW() on row mutation.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger across mutable tables
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function: sync_task_completed_at
-- Synchronizes completed_at timestamp when status transitions to or from 'DONE' or 'COMPLETED'.
CREATE OR REPLACE FUNCTION sync_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status IN ('DONE', 'COMPLETED')) AND (OLD.status NOT IN ('DONE', 'COMPLETED')) THEN
        IF NEW.completed_at IS NULL THEN
            NEW.completed_at = NOW();
        END IF;
    ELSIF (NEW.status NOT IN ('DONE', 'COMPLETED')) AND (OLD.status IN ('DONE', 'COMPLETED')) THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_sync_completed_at ON tasks;
CREATE TRIGGER trg_tasks_sync_completed_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION sync_task_completed_at();

-- 5. INDEXES

-- Users indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- Project Members indexes
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);

-- Partial index for overdue and open tasks filtering (avoids indexing completed tasks without due dates)
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_open ON tasks(due_date) 
    WHERE due_date IS NOT NULL AND status NOT IN ('DONE', 'COMPLETED');

-- Full text search index over task title and description for fast searching
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks 
    USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_task_created ON comments(task_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
