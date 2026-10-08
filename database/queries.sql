-- ==============================================================================
-- Project Management Database Queries
-- Representative parameterized queries for backend API integration
-- Uses PostgreSQL parameter placeholders ($1, $2, ...)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create User
-- Inserts a new user account with hashed credentials.
-- Parameters:
--   $1: email, $2: password_hash, $3: full_name, $4: avatar_url, $5: role
-- ------------------------------------------------------------------------------
INSERT INTO users (email, password_hash, full_name, avatar_url, role)
VALUES ($1, $2, $3, $4, COALESCE($5::user_system_role, 'MEMBER'::user_system_role))
RETURNING id, email, full_name, avatar_url, role, is_active, created_at;

-- ------------------------------------------------------------------------------
-- 2. Find User by Email
-- Look up active user for authentication and login verification.
-- Parameters:
--   $1: email
-- ------------------------------------------------------------------------------
SELECT 
    id,
    email,
    password_hash,
    full_name,
    avatar_url,
    role,
    is_active,
    created_at,
    updated_at
FROM users
WHERE LOWER(email) = LOWER(TRIM($1))
  AND is_active = TRUE;

-- ------------------------------------------------------------------------------
-- 3. Create Project
-- Creates a project record with an assigned creator/owner.
-- Parameters:
--   $1: name, $2: description, $3: status, $4: owner_id, $5: start_date, $6: due_date
-- ------------------------------------------------------------------------------
INSERT INTO projects (name, description, status, owner_id, start_date, due_date)
VALUES ($1, $2, COALESCE($3::project_status, 'NOT_STARTED'::project_status), $4, $5, $6)
RETURNING id, name, description, status, owner_id, start_date, due_date, created_at, updated_at;

-- ------------------------------------------------------------------------------
-- 4. Add User to Project
-- Adds a user to project membership with an assigned role (or updates role if already added).
-- Parameters:
--   $1: project_id, $2: user_id, $3: role ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
-- ------------------------------------------------------------------------------
INSERT INTO project_members (project_id, user_id, role)
VALUES ($1, $2, COALESCE($3::project_role, 'MEMBER'::project_role))
ON CONFLICT (project_id, user_id) 
DO UPDATE SET role = EXCLUDED.role
RETURNING id, project_id, user_id, role, joined_at;

-- ------------------------------------------------------------------------------
-- 5. List Projects for a User
-- Retrieves all projects where the user is either the owner or an active member.
-- Returns project details along with member count and total task count.
-- Parameters:
--   $1: user_id
-- ------------------------------------------------------------------------------
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    p.description,
    p.status,
    p.start_date,
    p.due_date,
    p.owner_id,
    u.full_name AS owner_name,
    pm.role AS user_project_role,
    COUNT(DISTINCT pm_all.user_id) AS total_members,
    COUNT(DISTINCT t.id) AS total_tasks,
    p.created_at
FROM projects p
JOIN project_members pm 
    ON p.id = pm.project_id AND pm.user_id = $1
JOIN users u 
    ON p.owner_id = u.id
LEFT JOIN project_members pm_all 
    ON p.id = pm_all.project_id
LEFT JOIN tasks t 
    ON p.id = t.project_id
GROUP BY p.id, u.full_name, pm.role
ORDER BY p.created_at DESC;

-- ------------------------------------------------------------------------------
-- 6. Create Task
-- Creates a work item within a project.
-- Parameters:
--   $1: project_id, $2: title, $3: description, $4: status, $5: priority,
--   $6: assigned_to (nullable), $7: created_by, $8: due_date (nullable), $9: estimated_hours (nullable)
-- ------------------------------------------------------------------------------
INSERT INTO tasks (
    project_id,
    title,
    description,
    status,
    priority,
    assigned_to,
    created_by,
    due_date,
    estimated_hours
)
VALUES (
    $1,
    $2,
    $3,
    COALESCE($4::task_status, 'PENDING'::task_status),
    COALESCE($5::task_priority, 'MEDIUM'::task_priority),
    $6,
    $7,
    $8,
    $9
)
RETURNING id, project_id, title, description, status, priority, assigned_to, created_by, due_date, estimated_hours, created_at;

-- ------------------------------------------------------------------------------
-- 7. Assign Task
-- Assigns or reassigns an existing task to a team member (or null to unassign).
-- Parameters:
--   $1: task_id, $2: assigned_to_user_id
-- ------------------------------------------------------------------------------
UPDATE tasks
SET assigned_to = $2
WHERE id = $1
RETURNING id, project_id, title, status, priority, assigned_to, updated_at;

-- ------------------------------------------------------------------------------
-- 8. Update Task Status
-- Updates the status of a task (automatically synchronizes completed_at via trigger).
-- Parameters:
--   $1: task_id, $2: new_status ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED')
-- ------------------------------------------------------------------------------
UPDATE tasks
SET status = $2::task_status
WHERE id = $1
RETURNING id, project_id, title, status, priority, completed_at, updated_at;

-- ------------------------------------------------------------------------------
-- 9. List Project Tasks
-- Retrieves all tasks belonging to a project, including assignee and creator details.
-- Parameters:
--   $1: project_id
-- ------------------------------------------------------------------------------
SELECT 
    t.id AS task_id,
    t.project_id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.estimated_hours,
    t.completed_at,
    t.created_at,
    t.updated_at,
    assignee.id AS assignee_id,
    assignee.full_name AS assignee_name,
    assignee.avatar_url AS assignee_avatar,
    creator.id AS creator_id,
    creator.full_name AS creator_name,
    (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) AS comments_count
FROM tasks t
LEFT JOIN users assignee ON t.assigned_to = assignee.id
JOIN users creator ON t.created_by = creator.id
WHERE t.project_id = $1
ORDER BY 
    CASE t.priority
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
    END,
    t.due_date ASC NULLS LAST;

-- ------------------------------------------------------------------------------
-- 10. Filter Tasks by Status
-- Retrieves tasks for a project filtered by specific status.
-- Parameters:
--   $1: project_id, $2: status
-- ------------------------------------------------------------------------------
SELECT 
    t.id AS task_id,
    t.project_id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    u.full_name AS assignee_name
FROM tasks t
LEFT JOIN users u ON t.assigned_to = u.id
WHERE t.project_id = $1
  AND t.status = $2::task_status
ORDER BY t.created_at DESC;

-- ------------------------------------------------------------------------------
-- 11. Filter Tasks by Priority
-- Retrieves tasks for a project filtered by specific priority.
-- Parameters:
--   $1: project_id, $2: priority
-- ------------------------------------------------------------------------------
SELECT 
    t.id AS task_id,
    t.project_id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    u.full_name AS assignee_name
FROM tasks t
LEFT JOIN users u ON t.assigned_to = u.id
WHERE t.project_id = $1
  AND t.priority = $2::task_priority
ORDER BY t.due_date ASC NULLS LAST;

-- ------------------------------------------------------------------------------
-- 12. Search Tasks
-- Fast search matching query keywords across task title and description.
-- Supports Full-Text Search (indexed) with ILIKE fallback.
-- Parameters:
--   $1: project_id, $2: search_term
-- ------------------------------------------------------------------------------
SELECT 
    t.id AS task_id,
    t.project_id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    u.full_name AS assignee_name,
    ts_rank(to_tsvector('english', t.title || ' ' || COALESCE(t.description, '')), plainto_tsquery('english', $2)) AS rank
FROM tasks t
LEFT JOIN users u ON t.assigned_to = u.id
WHERE t.project_id = $1
  AND (
      to_tsvector('english', t.title || ' ' || COALESCE(t.description, '')) @@ plainto_tsquery('english', $2)
      OR t.title ILIKE '%' || $2 || '%'
  )
ORDER BY rank DESC, t.updated_at DESC;

-- ------------------------------------------------------------------------------
-- 13. Add Comment
-- Inserts a comment on a task.
-- Parameters:
--   $1: task_id, $2: user_id, $3: content
-- ------------------------------------------------------------------------------
INSERT INTO comments (task_id, user_id, content)
VALUES ($1, $2, $3)
RETURNING id, task_id, user_id, content, created_at, updated_at;

-- ------------------------------------------------------------------------------
-- 14. Retrieve Task Comments
-- Fetches full chronological discussion thread for a task with author profiles.
-- Parameters:
--   $1: task_id
-- ------------------------------------------------------------------------------
SELECT 
    c.id AS comment_id,
    c.task_id,
    c.content,
    c.created_at,
    c.updated_at,
    u.id AS author_id,
    COALESCE(u.full_name, 'Deactivated User') AS author_name,
    u.avatar_url AS author_avatar
FROM comments c
LEFT JOIN users u ON c.user_id = u.id
WHERE c.task_id = $1
ORDER BY c.created_at ASC;

-- ------------------------------------------------------------------------------
-- 15. Retrieve Project Members
-- Lists all enrolled members of a project with their roles and contact details.
-- Parameters:
--   $1: project_id
-- ------------------------------------------------------------------------------
SELECT 
    pm.id AS membership_id,
    pm.project_id,
    u.id AS user_id,
    u.full_name,
    u.email,
    u.avatar_url,
    pm.role AS project_role,
    pm.joined_at
FROM project_members pm
JOIN users u ON pm.user_id = u.id
WHERE pm.project_id = $1
ORDER BY 
    CASE pm.role
        WHEN 'OWNER' THEN 1
        WHEN 'ADMIN' THEN 2
        WHEN 'MEMBER' THEN 3
        WHEN 'VIEWER' THEN 4
    END,
    pm.joined_at ASC;

-- ------------------------------------------------------------------------------
-- 16. Retrieve Dashboard / Project Statistics
-- Aggregates real-time project metrics: total tasks, status breakdowns, completion %,
-- total estimated hours, and overdue count.
-- Parameters:
--   $1: project_id
-- ------------------------------------------------------------------------------
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    p.status AS project_status,
    COUNT(t.id) AS total_tasks,
    COUNT(t.id) FILTER (WHERE t.status IN ('DONE', 'COMPLETED')) AS completed_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'IN_PROGRESS') AS in_progress_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'IN_REVIEW') AS in_review_tasks,
    COUNT(t.id) FILTER (WHERE t.status IN ('TODO', 'PENDING')) AS todo_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'BLOCKED') AS blocked_tasks,
    COUNT(t.id) FILTER (WHERE t.due_date < NOW() AND t.status NOT IN ('DONE', 'COMPLETED')) AS overdue_tasks,
    ROUND(
        COALESCE(
            (COUNT(t.id) FILTER (WHERE t.status IN ('DONE', 'COMPLETED'))::NUMERIC / NULLIF(COUNT(t.id), 0)) * 100, 
            0
        ), 
        1
    ) AS completion_percentage,
    COALESCE(SUM(t.estimated_hours), 0) AS total_estimated_hours,
    (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS total_members
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
WHERE p.id = $1
GROUP BY p.id;

-- ------------------------------------------------------------------------------
-- 17. Retrieve Overdue Tasks
-- Finds all uncompleted tasks where the due date is in the past across projects or for a user.
-- Parameters:
--   $1: project_id (pass NULL to fetch across all user projects),
--   $2: user_id (optional filter by assignee)
-- ------------------------------------------------------------------------------
SELECT 
    t.id AS task_id,
    t.project_id,
    p.name AS project_name,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    t.assigned_to,
    u.full_name AS assignee_name,
    ROUND(EXTRACT(EPOCH FROM (NOW() - t.due_date)) / 86400, 1) AS days_overdue
FROM tasks t
JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.assigned_to = u.id
WHERE t.due_date < NOW()
  AND t.status NOT IN ('DONE', 'COMPLETED')
  AND ($1::UUID IS NULL OR t.project_id = $1)
  AND ($2::UUID IS NULL OR t.assigned_to = $2)
ORDER BY t.due_date ASC;

-- ------------------------------------------------------------------------------
-- 18. Retrieve User's Assigned Tasks
-- Fetches all active tasks assigned to a specific user across all projects.
-- Useful for personal dashboard or "My Tasks" mobile view.
-- Parameters:
--   $1: user_id
-- ------------------------------------------------------------------------------
SELECT 
    t.id AS task_id,
    t.project_id,
    p.name AS project_name,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.estimated_hours,
    t.created_at,
    t.updated_at
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.assigned_to = $1
ORDER BY 
    CASE t.status
        WHEN 'IN_PROGRESS' THEN 1
        WHEN 'IN_REVIEW' THEN 2
        WHEN 'TODO' THEN 3
        WHEN 'BLOCKED' THEN 4
        WHEN 'DONE' THEN 5
    END,
    t.due_date ASC NULLS LAST;
