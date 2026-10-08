# Project Management System — Backend Service

This directory contains the production-grade Node.js + Express backend service for the full-stack Project Management Web + Mobile Web Application. It provides modular routing, controller-service separation, native PostgreSQL connection pooling via `pg`, secure password hashing via `bcrypt`, JWT authentication, full Project, Task, and Dashboard REST APIs, Helmet security headers, Express Rate Limiting, OpenAPI / Swagger documentation, Pagination, Sorting, Search, Filtering, and Audit Logging with multi-tenant user data isolation.

---

## 1. Technology Stack

- **Runtime:** Node.js (v18+, tested on v24.7.0)
- **Framework:** Express.js (v5.x)
- **Database Driver:** `pg` (node-postgres connection pool)
- **Password Hashing:** `bcrypt` (cost factor 10)
- **Authentication:** `jsonwebtoken` (HMAC SHA-256 JWT tokens)
- **Security Headers:** `helmet`
- **Rate Limiting:** `express-rate-limit`
- **API Documentation:** `swagger-ui-express` & `swagger-jsdoc` (OpenAPI 3.0)
- **CORS Support:** `cors` middleware
- **Environment Management:** `dotenv`
- **Development Server:** `nodemon`

---

## 2. Directory Architecture

```text
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # PostgreSQL connection pool configuration
│   │   └── swagger.js           # OpenAPI 3.0.0 specification configuration
│   │
│   ├── controllers/
│   │   ├── auth.controller.js   # Authentication controller (register, login, logout, getMe)
│   │   ├── dashboard.controller.js # Dashboard statistics controller
│   │   ├── health.controller.js # Health endpoints controller
│   │   ├── project.controller.js# Project CRUD controller with pagination & sorting
│   │   └── task.controller.js   # Task CRUD controller with pagination & sorting
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js   # JWT authentication & req.user identity guard
│   │   ├── error.middleware.js  # Centralized error and 404 handlers
│   │   └── rateLimit.middleware.js # Express rate limiters for auth and API routes
│   │
│   ├── routes/
│   │   ├── auth.routes.js       # Authentication routes (/api/auth)
│   │   ├── dashboard.routes.js  # Dashboard routes (/api/dashboard)
│   │   ├── docs.routes.js       # Swagger UI documentation routes (/api/docs)
│   │   ├── health.routes.js     # Health check routes (/api/health)
│   │   ├── project.routes.js    # Project routes (/api/projects)
│   │   └── task.routes.js       # Task routes (/api/tasks)
│   │
│   ├── services/
│   │   ├── audit.service.js     # Security and action audit logging service
│   │   ├── auth.service.js      # User registration, authentication, token generation
│   │   ├── dashboard.service.js # User-scoped aggregate metrics calculation
│   │   ├── project.service.js   # Project CRUD, ownership, pagination & sorting logic
│   │   └── task.service.js      # Task CRUD, project isolation, pagination & sorting logic
│   │
│   ├── utils/
│   │   ├── jwt.js               # JWT signing and verification helpers
│   │   ├── pagination.js        # Pagination & sorting helpers and column allowlists
│   │   ├── password.js          # Bcrypt hashing and comparison helpers
│   │   └── validation.js        # UUID regex, date checks, and PostgreSQL ENUM constants
│   │
│   ├── app.js                   # Express application setup, Helmet, CORS, Swagger mounting
│   └── server.js                # Server entry point, DB verification, shutdown handlers
│
├── .env                         # Local environment variables (git-ignored)
├── .env.example                 # Template for environment configuration
├── .gitignore                   # Excludes node_modules, .env, and log files
├── package.json                 # Project dependencies and npm scripts
└── README.md                    # Backend documentation and execution guide
```

---

## 3. Database Mapping Decisions

The PostgreSQL database schema is authoritative. The backend bridges conceptual assessment terms with standard relational design:

| Assessment Concept | Database Column | Backend Mapping Rule |
|:---|:---|:---|
| **Project User / Owner** | `projects.owner_id` | Mapped from authenticated token: `req.user.id ➔ projects.owner_id`. Never accepted directly from client payload. |
| **Project End Date** | `projects.due_date` | Accepts `due_date` or `end_date` from request body and persists to `due_date`. |
| **Task Author** | `tasks.created_by` | Mapped from authenticated token: `req.user.id ➔ tasks.created_by`. Never trusted from client payload. |
| **Task Assignee** | `tasks.assigned_to` | Optional assignee UUID (`assigned_to`). Validated against active project members. |
| **Task Title / Name** | `tasks.title` | Accepts `title` or `name` from client and persists to `tasks.title`. |
| **Task Completion** | `tasks.completed_at` | Automatically managed by PostgreSQL trigger `trg_tasks_sync_completed_at` upon status transition to `'COMPLETED'` or `'DONE'`. |
| **Audit Trail** | `audit_logs` | Logs state-changing actions (`PROJECT_CREATED`, `TASK_UPDATED`, etc.) without recording secrets or passwords. |

---

## 4. Environment Configuration

Copy the template file to create your local `.env`:

```bash
cp .env.example .env
```

### Configuration Variables

| Variable | Default Value | Description |
|:---|:---|:---|
| `PORT` | `5001` | HTTP port the server listens on (defaults to 5001 to avoid macOS AirPlay conflict on 5000) |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `DB_HOST` | `localhost` | PostgreSQL host address |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `project_management` | Name of the PostgreSQL database created in Phase 1 |
| `DB_USER` | `postgres` | Database username |
| `DB_PASSWORD` | *(empty)* | Database user password (leave empty if peer/local trust auth is used) |
| `JWT_SECRET` | `dev_secret...` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN`| `7d` | Token expiration duration (e.g. `7d`, `24h`) |
| `CLIENT_URL` | `http://localhost:3000` | Allowed CORS origin for web frontend |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window in milliseconds (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Maximum requests allowed per IP per rate limit window |
| `PAGINATION_DEFAULT_LIMIT` | `10` | Default page size if not specified in query |
| `PAGINATION_MAX_LIMIT` | `100` | Maximum allowable page size |

---

## 5. Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Verify Database:**
   Ensure PostgreSQL is running and the database `project_management` is created and migrated:
   ```bash
   psql -d project_management -f ../database/schema.sql
   psql -d project_management -f ../database/seed.sql
   psql -d project_management -f ../database/migration_audit_logs.sql
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```

---

## 6. API Documentation & Interactive Swagger UI

Interactive Swagger documentation is available at:
- **Interactive UI:** `http://localhost:5001/api/docs/`
- **OpenAPI 3.0 JSON Spec:** `http://localhost:5001/api/docs/swagger.json`

---

## 7. API Endpoints Specification

### 7.1 Health Check Endpoints
- `GET /api/health` ➔ `200 OK` `{ "success": true, "message": "API is running" }`
- `GET /api/health/db` ➔ `200 OK` `{ "success": true, "message": "Database connected" }`

### 7.2 Authentication APIs (`/api/auth`)
- `POST /api/auth/register` — Registers user with bcrypt password hashing. (Rate limited)
- `POST /api/auth/login` — Authenticates credentials and returns JWT token. (Rate limited)
- `POST /api/auth/logout` — Stateless logout instruction.
- `GET /api/auth/me` — Protected profile retrieval using Bearer JWT.

### 7.3 Project APIs (`/api/projects`)

- **`GET /api/projects`**
  - **Query Parameters:**
    - `page` (integer, default: `1`): Current page number.
    - `limit` (integer, default: `10`, max: `100`): Items per page.
    - `search` (string): Case-insensitive search on `name` and `description`.
    - `status` (string): Filter by status (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `PLANNING`, `ACTIVE`, `ON_HOLD`, `ARCHIVED`).
    - `sortBy` (string, default: `'created_at'`): Field to sort by (`name`, `status`, `start_date`, `due_date`, `created_at`, `updated_at`).
    - `order` (string, default: `'DESC'`): Sort direction (`'ASC'` or `'DESC'`).
  - **Response:**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "22222222-2222-2222-2222-222222222201",
          "name": "Cloud Infrastructure Modernization",
          "description": "Migrate core microservices to Kubernetes",
          "status": "IN_PROGRESS",
          "owner_id": "11111111-1111-1111-1111-111111111101",
          "owner_name": "Alice Johnson",
          "user_role": "OWNER",
          "start_date": "2026-09-01",
          "due_date": "2026-12-31",
          "total_members": "3",
          "total_tasks": "4"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 1,
        "totalPages": 1,
        "hasNextPage": false,
        "hasPreviousPage": false
      }
    }
    ```
- **`GET /api/projects/:id`** — Get single project with authorization guard.
- **`POST /api/projects`** — Create project (`owner_id = req.user.id`).
- **`PUT /api/projects/:id`** — Update project details.
- **`DELETE /api/projects/:id`** — Delete project (Owner only).

### 7.4 Task APIs (`/api/tasks`)

- **`GET /api/tasks`**
  - **Query Parameters:**
    - `page` (integer, default: `1`): Current page number.
    - `limit` (integer, default: `10`, max: `100`): Items per page.
    - `search` (string): Case-insensitive search on `title` and `description`.
    - `status` (string): Filter by task status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `TODO`, `IN_REVIEW`, `DONE`, `BLOCKED`).
    - `priority` (string): Filter by priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
    - `project_id` (UUID): Restrict to specific parent project.
    - `assigned_to` (UUID): Filter by assignee user ID.
    - `sortBy` (string, default: `'created_at'`): Field to sort by (`title`, `status`, `priority`, `due_date`, `estimated_hours`, `completed_at`, `created_at`).
    - `order` (string, default: `'DESC'`): Sort direction (`'ASC'` or `'DESC'`).
  - **Response:** Array of tasks with `pagination` metadata object.
- **`GET /api/tasks/:id`** — Get task by ID.
- **`POST /api/tasks`** — Create task (`created_by = req.user.id`, validates assignee project membership).
- **`PUT /api/tasks/:id`** — Update task details, status, priority, or assignee.
- **`DELETE /api/tasks/:id`** — Delete task (Owner, Creator, or Admin).

### 7.5 Dashboard API (`/api/dashboard`)
- **`GET /api/dashboard`** — User-isolated counts (`totalProjects`, `totalTasks`, `completedTasks`, `pendingTasks`, `projectsInProgress`).

---

## 8. Audit Logging & Security Enhancements

1. **Audit Logs Table (`audit_logs`):**
   - Automatically logs state changes: `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_DELETED`, `TASK_CREATED`, `TASK_UPDATED`, `TASK_STATUS_CHANGED`, `TASK_COMPLETED`, `TASK_DELETED`, `AUTH_LOGIN`, `AUTH_REGISTER`.
   - Sanitized metadata: Guarantees no passwords, password hashes, JWT tokens, or credentials are recorded.
2. **Rate Limiting:**
   - Protects authentication endpoints (`/api/auth/register`, `/api/auth/login`) against brute-force password attacks, returning `429 Too Many Requests`.
3. **Helmet Security Headers:**
   - Automatically provides `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Strict-Transport-Security`.
4. **Strict Multi-Tenant Isolation:**
   - Enforces `403 Forbidden` on unauthorized project or task operations.
   - Filtering, pagination, sorting, and search can never expose another tenant's private data.
