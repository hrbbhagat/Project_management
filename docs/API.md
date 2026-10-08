# Project Management System — REST API Documentation

This document provides the complete API specification for the **Project Management System Backend REST API**.

- **Base URL:** `http://localhost:5001/api`
- **Interactive Swagger UI:** `http://localhost:5001/api/docs`
- **OpenAPI 3.0 JSON:** `http://localhost:5001/api/docs/swagger.json`
- **Shared Architecture:** Used identically by both the Web Frontend and the React Native Mobile Application.

---

## 1. Authentication & Security Headers

All protected endpoints require a valid JSON Web Token (JWT) supplied in the `Authorization` header:

```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

### Standard Response Envelope
All API endpoints return JSON conforming to standard response envelopes:

```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 24,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## 2. API Endpoints Reference

### 2.1 Authentication (`/api/auth`)

| Method | Endpoint | Auth Required | Description |
|:---|:---|:---:|:---|
| `POST` | `/api/auth/register` | No | Registers a new user account (hashes password with bcrypt, role `MEMBER`). |
| `POST` | `/api/auth/login` | No | Authenticates user credentials and issues a signed JWT token. |
| `POST` | `/api/auth/logout` | No | Stateless logout (instructs client to discard stored JWT). |
| `GET` | `/api/auth/me` | **Yes** | Returns the profile of the currently authenticated user. |

#### `POST /api/auth/register`
**Request Body:**
```json
{
  "full_name": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "Password123!"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "11111111-2222-3333-4444-555555555555",
    "full_name": "Jane Doe",
    "email": "jane.doe@example.com",
    "role": "MEMBER",
    "is_active": true,
    "created_at": "2026-10-08T00:00:00.000Z"
  }
}
```

#### `POST /api/auth/login`
**Request Body:**
```json
{
  "email": "jane.doe@example.com",
  "password": "Password123!"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "11111111-2222-3333-4444-555555555555",
    "full_name": "Jane Doe",
    "email": "jane.doe@example.com",
    "role": "MEMBER"
  }
}
```

---

### 2.2 Project Management (`/api/projects`)

All project routes require JWT authentication. Multi-tenant BOLA isolation is enforced (users can only access projects they own or participate in).

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/projects` | List projects for authenticated user (supports `search`, `status`, `page`, `limit`, `sortBy`, `order`). |
| `GET` | `/api/projects/:id` | Retrieve single project details with membership and task metrics. |
| `POST` | `/api/projects` | Create a new project. |
| `PUT` | `/api/projects/:id` | Update project name, description, status, or date bounds. |
| `DELETE` | `/api/projects/:id` | Delete project and cascade-remove tasks and members. |

#### `POST /api/projects`
**Request Body:**
```json
{
  "name": "Cloud Infrastructure Modernization",
  "description": "Migrate services to distributed cloud containers",
  "status": "IN_PROGRESS",
  "start_date": "2026-08-01",
  "due_date": "2026-12-31"
}
```

---

### 2.3 Task Management (`/api/tasks`)

All task routes require JWT authentication and verify that the target task and its parent project belong to the authenticated user.

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/tasks` | List accessible tasks (supports `project_id`, `status`, `priority`, `search`, `page`, `limit`, `sortBy`, `order`). |
| `GET` | `/api/tasks/:id` | Retrieve single task details. |
| `POST` | `/api/tasks` | Create a new task within an authorized project. |
| `PUT` | `/api/tasks/:id` | Update task title, description, status, priority, due date, or assignee. |
| `DELETE` | `/api/tasks/:id` | Delete a task. |

#### `POST /api/tasks`
**Request Body:**
```json
{
  "project_id": "22222222-2222-2222-2222-222222222201",
  "title": "Configure SSL Certificates",
  "description": "Install wildcard TLS certificates on load balancers",
  "status": "TODO",
  "priority": "HIGH",
  "due_date": "2026-11-15",
  "estimated_hours": 4
}
```

#### Task Status Values:
* `TODO` / `PENDING`
* `IN_PROGRESS`
* `IN_REVIEW`
* `DONE` / `COMPLETED`
* `BLOCKED`

#### Task Priority Values:
* `LOW`
* `MEDIUM`
* `HIGH`
* `URGENT`

---

### 2.4 Dashboard (`/api/dashboard`)

Returns aggregated analytics metrics calculated in real-time from PostgreSQL, strictly scoped to the authenticated tenant.

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/dashboard` | Retrieve authenticated user's project and task summary statistics. |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalProjects": 4,
    "totalTasks": 21,
    "completedTasks": 6,
    "pendingTasks": 15,
    "projectsInProgress": 3
  }
}
```

---

### 2.5 Health & Diagnostics (`/api/health`)

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/health` | Service uptime and memory diagnostics. |
| `GET` | `/api/health/db` | Real-time PostgreSQL connectivity and query round-trip latency probe. |
