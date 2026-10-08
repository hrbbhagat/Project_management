# Taskline — Cross-Platform Project Management System (Web + Mobile)

A production-grade, multi-tenant project management workspace featuring a **React Web Application** and a **React Native / Expo Mobile Application** powered by a single **Node.js + Express REST API** and a unified **PostgreSQL Database**.

---

## 1. System Architecture

Both the Web and Mobile applications communicate with the **SAME backend REST API** and the **SAME PostgreSQL database**. There is no separate backend or mock service for the mobile application.

```mermaid
flowchart TB
    subgraph Clients["Client Applications"]
        WEB["React Web Frontend\n(React 19 + Vite + TanStack)\nPort: 8080"]
        MOBILE["Mobile App (Android / iOS)\n(React Native + Expo SDK 57)\nPort: 8081"]
    end

    subgraph BackendAPI["Centralized REST API"]
        EXPRESS["Node.js + Express REST API\n(JWT, Rate Limiting, Helmet, Swagger)\nPort: 5001\nRoute Prefix: /api/*"]
    end

    subgraph Database["Relational Storage"]
        POSTGRES[("PostgreSQL Database\n(project_management)\nPort: 5432")]
    end

    WEB -->|"HTTP / REST\n(Authorization: Bearer JWT)"| EXPRESS
    MOBILE -->|"HTTP / REST\n(Authorization: Bearer JWT)"| EXPRESS
    EXPRESS -->|"Parameterized SQL\n(pg connection pool)"| POSTGRES
```

### Key Architectural Tenets
1. **Single Source of Truth:** All project, task, and user entities live in PostgreSQL; business logic is executed strictly on the Express backend.
2. **Zero Direct Database Access from Clients:** Neither Web nor Mobile connects directly to PostgreSQL.
3. **Stateless JWT Authentication:** Authentication is handled with cryptographic JSON Web Tokens (Bearer scheme) issued upon verification of bcrypt-hashed passwords.
4. **Multi-Tenant Ownership & Isolation (BOLA Protected):** Database queries are strictly scoped to the authenticated user ID (`owner_id = $1 OR pm.user_id = $1`), preventing cross-tenant data leaks.

---

## 2. Technology Stack

### Backend API (`backend/`)
- **Runtime & Framework:** Node.js (v20+) & Express (v5.2)
- **Database Driver:** `pg` (node-postgres connection pool)
- **Authentication:** `jsonwebtoken` (JWT) & `bcrypt` (10 salt rounds)
- **Security & Reliability:** `helmet` (HTTP headers), `cors` (origin validation), `express-rate-limit` (brute-force protection on auth routes)
- **API Documentation:** `swagger-ui-express` & `swagger-jsdoc` (OpenAPI 3.0 specification)
- **Dev Tooling:** `nodemon`, `dotenv`

### Web Frontend (`frontend/`)
- **Framework & Language:** React 19, TypeScript (Strict mode)
- **Build Tooling & Routing:** Vite 8, TanStack Router, TanStack Start (SSR / Nitro engine)
- **Server State & Caching:** `@tanstack/react-query` (v5)
- **Styling & UI System:** Tailwind CSS (v4), Radix UI Primitives, Lucide React Icons
- **Notifications:** `sonner` toast notification system

### Mobile Application (`mobile/`)
- **Framework & SDK:** React Native (0.86) + Expo (SDK 57)
- **Language:** TypeScript (Strict mode)
- **Navigation:** React Navigation (NativeStack + Bottom Tabs)
- **Secure Token Storage:** `expo-secure-store` (Hardware Keystore on Android / Keychain on iOS)
- **State Management:** React Context API (`AuthContext`)
- **Network Layer:** Centralized `ApiClient` with 15-second AbortController timeout protection and global 401 session expiration interceptor
- **Iconography:** `@expo/vector-icons` (Ionicons)

### Database (`database/`)
- **Engine:** PostgreSQL 14+
- **Schema Design:** 6 relational tables (`users`, `projects`, `project_members`, `tasks`, `comments`, `audit_logs`)
- **Domain Enums:** `user_system_role`, `project_status`, `project_role`, `task_status`, `task_priority`

---

## 3. Key Features

### 🔐 Authentication & Session Security
- **Registration:** Validates full name, email format (RFC 5322 regex), and password complexity ($\ge 8$ chars). Hashes passwords with bcrypt.
- **Login:** Issues signed JWT tokens with 7-day expiration.
- **Hardware-Backed Storage on Mobile:** JWT tokens are persisted in device Keystore/Keychain via `expo-secure-store`.
- **Session Auto-Restoration:** Verifies existing tokens via `GET /api/auth/me` upon application startup.
- **Automatic Session Expiration (401 Interceptor):** Expired or invalidated tokens automatically purge storage, update auth state, and transition the user to the Login screen with a notification.
- **Cross-Platform Single Sign-On:** Accounts registered on Mobile log into Web; accounts registered on Web log into Mobile.

### 📁 Project Management (Full CRUD)
- **Create Project:** Modal dialogs with field validation for project name, description, status, and date bounds (`due_date >= start_date`).
- **View Projects:** Server-side paginated grid/list with real-time task counts, member counts, and status badges.
- **Project Details View:** Workspace view displaying owner metadata, schedule dates, and associated project tasks.
- **Edit Project:** Inline update modal modifying name, description, status, and dates with immediate backend synchronization.
- **Delete Project:** Deletion with confirmation dialog; enforces owner-only deletion permissions and cascades child tasks.
- **Status Lifecycle:** `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `PLANNING`, `ON_HOLD`.

### ✅ Task Management (Full CRUD)
- **Create Task:** Assign tasks to projects with title, description, priority, assignee, due date, and estimated hours.
- **View Tasks:** Filterable list displaying priority badges, status indicators, assignee details, and project affiliations.
- **Inline Completion Toggle:** Toggle task status to `DONE` directly from the task list on Web and Mobile, which updates the `completed_at` timestamp.
- **Edit & Delete Tasks:** Modify title, status, priority, and metadata; delete with permission guards.
- **Priority Levels:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- **Task Statuses:** `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `BLOCKED`, `PENDING`.

### 📊 Real-Time Dashboard Metrics
All metrics are computed server-side via SQL Common Table Expressions (CTE) scoped to the authenticated user:
- **Total Projects:** Count of user-owned and accessible member projects.
- **Total Tasks:** Count of tasks within accessible projects.
- **Completed Tasks:** Count of tasks marked `COMPLETED` or `DONE`.
- **Pending Tasks:** Count of active, non-completed tasks.
- **Projects In Progress:** Count of projects currently in `IN_PROGRESS` status.

### 🔍 Search, Filtering & Server-Side Sorting
- **Substring Search:** Server-side `ILIKE` substring search across project names, descriptions, task titles, and task descriptions.
- **Status & Priority Filters:** Server-side query parameter filtering (`?status=...`, `?priority=...`).
- **Multi-Field Sorting:** Server-side sorting (`?sortBy=created_at&order=DESC`, `name`, `due_date`, `priority`, `status`).
- **Pagination:** Structured metadata (`page`, `limit`, `total`, `totalPages`, `hasNextPage`, `hasPreviousPage`).

---

## 4. Repository Structure

```
Project_management/
├── backend/                  # Node.js + Express REST API
│   ├── src/
│   │   ├── config/          # Database pool & Swagger OpenAPI definition
│   │   ├── controllers/     # Route request/response handlers
│   │   ├── middleware/      # JWT auth, error handler, rate limiter
│   │   ├── routes/          # REST route declarations
│   │   ├── services/        # Business logic & parameterized SQL queries
│   │   └── utils/           # Password hashing, JWT utils, validators
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── frontend/                 # React 19 + Vite Web Application
│   ├── src/
│   │   ├── components/      # UI component library, modals, tables, forms
│   │   ├── routes/          # TanStack file-based routes (_authenticated)
│   │   ├── services/        # API client and service endpoints
│   │   ├── types/           # TypeScript data interfaces
│   │   └── lib/             # Design tokens and formatters
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── mobile/                   # React Native + Expo Mobile Application
│   ├── src/
│   │   ├── components/      # Reusable Native UI components (Card, Badge, Input, Button)
│   │   ├── constants/       # Color palette, spacing, typography, config
│   │   ├── context/         # AuthContext state management
│   │   ├── navigation/      # NativeStack & BottomTab navigators
│   │   ├── screens/         # Auth, Dashboard, Projects, Tasks, Profile screens
│   │   ├── services/api/    # Centralized API client & endpoint services
│   │   ├── types/           # TypeScript API & entity models
│   │   └── utils/           # SecureStore, validation, formatters
│   ├── .env.example
│   ├── app.json
│   ├── package.json
│   └── README.md
│
├── database/                 # PostgreSQL Database Resources
│   ├── schema.sql           # Complete DDL: extensions, enums, tables, FKs, constraints
│   ├── seed.sql             # Development seed data with pre-hashed credentials
│   ├── queries.sql          # Canonical SQL query reference
│   ├── ER_DIAGRAM.md        # Entity Relationship documentation
│   └── README.md
│
├── docs/                     # Project Documentation
│   ├── API.md                # Comprehensive REST API Specification
│   ├── FINAL_TEST_REPORT.md  # 105-Point Quality Assurance Test Report
│   └── FINAL_RELEASE_CHECKLIST.md # Full Assignment Compliance Matrix
│
├── scripts/                  # Automated E2E & Security Verification Suites
│   ├── test_phase19_e2e.js       # Master 27-point full-stack E2E integration test
│   ├── test_project_crud_e2e.js  # 19-point bidirectional project CRUD test
│   ├── test_stage3_cross_platform_acceptance.js # Web <-> Mobile live sync acceptance
│   └── test_security_isolation_acceptance.js   # 21-point multi-tenant BOLA security test
├── .env.example              # Consolidated Environment Configuration Template
├── .gitignore                # Repository Git Ignore Rules
└── README.md                 # Master Project Overview & Setup Guide
```

---

## 5. REST API Specification

Interactive Swagger OpenAPI 3.0 documentation is available at **`http://localhost:5001/api/docs`**.

| Endpoint | Method | Authentication | Description |
|:---|:---:|:---:|:---|
| `/api/health` | `GET` | Public | Service health check |
| `/api/docs` | `GET` | Public | Interactive Swagger API documentation |
| `/api/auth/register` | `POST` | Public | Register new user account (`full_name`, `email`, `password`) |
| `/api/auth/login` | `POST` | Public | Authenticate credentials and receive signed JWT |
| `/api/auth/logout` | `POST` | Bearer JWT | Stateless client token discard confirmation |
| `/api/auth/me` | `GET` | Bearer JWT | Fetch current authenticated user profile |
| `/api/projects` | `GET` | Bearer JWT | List accessible projects with pagination, sorting & search |
| `/api/projects/:id` | `GET` | Bearer JWT | Get project details, task count & member count |
| `/api/projects` | `POST` | Bearer JWT | Create project workspace (`name`, `description`, `status`, `dates`) |
| `/api/projects/:id` | `PUT` | Bearer JWT | Update project details (Owner / Admin only) |
| `/api/projects/:id` | `DELETE` | Bearer JWT | Delete project workspace & cascade child tasks (Owner only) |
| `/api/tasks` | `GET` | Bearer JWT | List tasks with filters (`search`, `status`, `priority`, `project_id`) |
| `/api/tasks/:id` | `GET` | Bearer JWT | Get task details by UUID |
| `/api/tasks` | `POST` | Bearer JWT | Create task under project |
| `/api/tasks/:id` | `PUT` | Bearer JWT | Update task fields, status, priority, assignee |
| `/api/tasks/:id` | `DELETE` | Bearer JWT | Delete task (Creator / Project Owner only) |
| `/api/dashboard` | `GET` | Bearer JWT | Get aggregated user-scoped project and task statistics |

---

## 6. Step-by-Step Local Setup Guide

### Prerequisites
- **Node.js:** v20.x or higher
- **PostgreSQL:** v14.x or higher
- **Package Manager:** `npm` (included with Node.js)
- **Mobile Target (Optional):** Android Studio / Emulator OR physical device with **Expo Go**

---

### Step 1: Initialize the PostgreSQL Database

```bash
# Ensure PostgreSQL is running
# macOS: brew services start postgresql@14 (or default postgres service)

# Create database and apply schema
createdb project_management || true
psql "postgresql://postgres:postgres@localhost:5432/project_management" -f database/schema.sql

# (Optional) Load seed demonstration data
psql "postgresql://postgres:postgres@localhost:5432/project_management" -f database/seed.sql
```

---

### Step 2: Start the Express Backend API

Open **Terminal 1**:

```bash
cd backend
npm install
npm run dev
```

- **API Base:** `http://localhost:5001/api`
- **Health Check:** `http://localhost:5001/api/health`
- **Swagger Documentation:** `http://localhost:5001/api/docs`

---

### Step 3: Start the React Web Frontend

Open **Terminal 2**:

```bash
cd frontend
npm install
npm run dev
```

- **Web Application URL:** `http://localhost:8080`

---

### Step 4: Start the Expo Mobile Application

Open **Terminal 3**:

```bash
cd mobile
npm install
npx expo start
```

#### Launching the Mobile App:
- **Android Emulator:** Press `a` in the terminal. *(The app automatically routes to `http://10.0.2.2:5001/api` for the Android emulator).*
- **Physical Device:** Install **Expo Go** from Google Play Store or Apple App Store. Set your computer's local Wi-Fi IP in `mobile/.env` (`EXPO_PUBLIC_API_URL=http://192.168.1.X:5001/api`) and scan the terminal QR code.
- **Web Preview:** Press `w` in the terminal.

---

## 7. Default Test Accounts

| Account Role | Email | Password | Pre-populated Data |
|:---|:---|:---|:---|
| **Primary User (Alpha)** | `testuser1@example.com` | `Password123!` | 1 Project, 16 Tasks |
| **Secondary User (Beta)** | `testuser2@example.com` | `Password123!` | 1 Project, 8 Tasks |

*(You can also register a new account from either the Web or Mobile application).*

---

## 8. Automated E2E Testing & Verification

The repository includes automated end-to-end integration test runners that validate real HTTP traffic, PostgreSQL persistence, and cross-platform synchronization:

```bash
# Run Master 27-Point E2E Integration Suite (Auth, Token Expiry, Isolation, CRUD, Network Failures)
node scripts/test_phase19_e2e.js

# Run Cross-Platform Project CRUD Integration Suite (19 Tests)
node scripts/test_project_crud_e2e.js
```

### Static Type Checking & Production Builds
```bash
# Mobile TypeScript Compilation (0 errors)
cd mobile && npx tsc --noEmit

# Frontend Production Build (Nitro/Vite SSR)
cd frontend && npm run build
```

---

## 9. Security & Data Protection

- **Password Encryption:** Passwords are encrypted with bcrypt before being written to PostgreSQL.
- **SQL Injection Prevention:** 100% of database queries use parameterized `$n` placeholders.
- **Broken Object Level Authorization (BOLA):** Direct object reference attacks are blocked; users cannot query or mutate projects belonging to another tenant.
- **Rate Limiting:** Authentication routes are rate-limited to prevent brute-force credential stuffing.
- **Secure Token Handling:** JWTs are stored in hardware-backed device keystores, never exposed in URLs or logged to standard output.
