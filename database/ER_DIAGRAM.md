# Entity Relationship (ER) Diagram

This document contains the official Entity Relationship Diagram for the Project Management System, modeling the actual PostgreSQL schema implemented in [`database/schema.sql`](file:///Users/harsh/Desktop/Project_management/database/schema.sql).

---

## Mermaid ER Diagram

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : "owns (1:N)"
    USERS ||--o{ PROJECT_MEMBERS : "participates (1:N)"
    PROJECTS ||--o{ PROJECT_MEMBERS : "enrolls (1:N)"

    PROJECTS ||--o{ TASKS : "contains (1:N)"
    USERS ||--o{ TASKS : "creates (1:N)"
    USERS ||--o{ TASKS : "assigned_to (0..1:N)"

    TASKS ||--o{ COMMENTS : "contains (1:N)"
    USERS ||--o{ COMMENTS : "authors (0..1:N)"

    USERS {
        uuid id PK "gen_random_uuid()"
        varchar_100 full_name "NOT NULL"
        varchar_255 email "NOT NULL, UNIQUE, Lower-indexed"
        varchar_255 password_hash "NOT NULL (bcrypt)"
        varchar_512 avatar_url "NULL"
        user_system_role role "NOT NULL, DEFAULT 'MEMBER'"
        boolean is_active "NOT NULL, DEFAULT TRUE"
        timestamptz created_at "NOT NULL, DEFAULT NOW()"
        timestamptz updated_at "NOT NULL, DEFAULT NOW()"
    }

    PROJECTS {
        uuid id PK "gen_random_uuid()"
        varchar_150 name "NOT NULL, Indexed"
        text description "NULL"
        project_status status "NOT NULL, DEFAULT 'NOT_STARTED'"
        uuid owner_id FK "NOT NULL -> users(id) ON DELETE RESTRICT"
        date start_date "NULL"
        date due_date "NULL"
        timestamptz created_at "NOT NULL, DEFAULT NOW()"
        timestamptz updated_at "NOT NULL, DEFAULT NOW()"
    }

    PROJECT_MEMBERS {
        uuid id PK "gen_random_uuid()"
        uuid project_id FK "NOT NULL -> projects(id) ON DELETE CASCADE"
        uuid user_id FK "NOT NULL -> users(id) ON DELETE CASCADE"
        project_role role "NOT NULL, DEFAULT 'MEMBER'"
        timestamptz joined_at "NOT NULL, DEFAULT NOW()"
    }

    TASKS {
        uuid id PK "gen_random_uuid()"
        uuid project_id FK "NOT NULL -> projects(id) ON DELETE CASCADE"
        varchar_255 title "NOT NULL, FTS GIN indexed"
        text description "NULL"
        task_status status "NOT NULL, DEFAULT 'PENDING'"
        task_priority priority "NOT NULL, DEFAULT 'MEDIUM'"
        uuid assigned_to FK "NULL -> users(id) ON DELETE SET NULL"
        uuid created_by FK "NOT NULL -> users(id) ON DELETE RESTRICT"
        timestamptz due_date "NULL, Partial indexed"
        numeric_5_2 estimated_hours "NULL, CHECK >= 0"
        timestamptz completed_at "NULL"
        timestamptz created_at "NOT NULL, DEFAULT NOW()"
        timestamptz updated_at "NOT NULL, DEFAULT NOW()"
    }

    COMMENTS {
        uuid id PK "gen_random_uuid()"
        uuid task_id FK "NOT NULL -> tasks(id) ON DELETE CASCADE"
        uuid user_id FK "NULL -> users(id) ON DELETE SET NULL"
        text content "NOT NULL"
        timestamptz created_at "NOT NULL, DEFAULT NOW()"
        timestamptz updated_at "NOT NULL, DEFAULT NOW()"
    }
```

---

## Entity & Relationship Catalog

| Relationship | Type | Cardinality | Foreign Key | Delete Action | Architectural Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`users` ➔ `projects`** | One-to-Many | `1 : 0..*` | `projects.owner_id ➔ users.id` | `RESTRICT` | Explicit project ownership. Protects active projects from accidental creator deletion. |
| **`projects` ↔ `users`** | Many-to-Many | `* : *` | Junction via `project_members(project_id, user_id)` | `CASCADE` | Allows multi-user team collaboration with scoped permissions (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`). |
| **`projects` ➔ `tasks`** | One-to-Many | `1 : 0..*` | `tasks.project_id ➔ projects.id` | `CASCADE` | Projects group tasks. Deleting a project purges its tasks. |
| **`users` ➔ `tasks` (creator)** | One-to-Many | `1 : 0..*` | `tasks.created_by ➔ users.id` | `RESTRICT` | Preserves audit history of task creators. |
| **`users` ➔ `tasks` (assignee)** | One-to-Many | `0..1 : 0..*` | `tasks.assigned_to ➔ users.id` | `SET NULL` | Tasks can be unassigned; if an assignee leaves, the task remains intact. |
| **`tasks` ➔ `comments`** | One-to-Many | `1 : 0..*` | `comments.task_id ➔ tasks.id` | `CASCADE` | Comments belong to a task thread. Deleting a task cleans up discussion records. |
| **`users` ➔ `comments` (author)** | One-to-Many | `0..1 : 0..*` | `comments.user_id ➔ users.id` | `SET NULL` | Discussion threads remain readable even if a user account is deleted. |

---

## Legend

- **`PK`**: Primary Key (UUID v4 generated via `gen_random_uuid()`)
- **`FK`**: Foreign Key referencing parent table
- **`UNIQUE`**: Unique database constraint
- **`NOT NULL`**: Required field enforced by database schema
- **`Indexed`**: Backed by B-Tree, Partial, or GIN performance index
