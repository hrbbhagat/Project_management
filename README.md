# Project Management System

A production-grade, multi-tenant full-stack project and task management system engineered with a **React Web Application** and a **React Native / Expo Mobile Application**, powered by a unified **Node.js + Express REST API** and a single **PostgreSQL Database**.

Both the Web and Mobile client applications communicate with the **SAME backend REST API** and the **SAME PostgreSQL database**, ensuring real-time cross-platform state synchronization and data integrity.

---

## 1. System Architecture

```mermaid
flowchart TB
    subgraph Database["Neon PostgreSQL Database (Production)"]
        POSTGRES[("Neon PostgreSQL Database\n(Serverless DB via DATABASE_URL)\nSSL Encrypted Connection Pool")]
    end

    subgraph Backend["Render Web Service (Production)"]
        API["Node.js + Express REST API\n(JWT Auth, Rate Limiting, Helmet, Swagger OpenAPI)\nRoute Prefix: /api/*"]
    end

    subgraph Clients["Unified Client Applications"]
        WEB["React Web Application\n(React 19 + TanStack Start / Vite)\nDeployed on Vercel"]
        MOBILE["Mobile Application (Android / iOS)\n(React Native + Expo SDK 57)\nStandalone APK / Expo Go"]
    end

    WEB -->|"HTTPS REST API / Bearer JWT"| API
    MOBILE -->|"HTTPS REST API / Bearer JWT"| API
    API -->|"Parameterized SQL Queries (node-postgres)"| POSTGRES
```

### Architectural Highlights
- **Single Source of Truth:** All project, task, user, and membership records reside in a single PostgreSQL database; business logic and validations are enforced exclusively on the Express backend.
- **Zero Direct Client-to-Database Connections:** Neither the Web nor Mobile client connects directly to PostgreSQL. All operations pass through the authenticated REST API.
- **Stateless JWT Authentication:** Authentication utilizes JSON Web Tokens (Bearer scheme) with 7-day expiration. Passwords are cryptographically hashed using bcrypt (10 rounds).
- **Multi-Tenant Authorization & BOLA Protection:** Database queries enforce strict tenant scoping (`owner_id = $1 OR pm.user_id = $1`), preventing cross-tenant Broken Object Level Authorization exploits.

---

## 2. Production Deployment & Live Links

| Component | Platform | Live URL / Specification |
|:---|:---|:---|
| **Web Application** | Vercel | [https://project-management-jfyd.vercel.app](https://project-management-jfyd.vercel.app) |
| **Backend API** | Render | [https://project-management-backend-7atu.onrender.com](https://project-management-backend-7atu.onrender.com) |
| **API Documentation** | Swagger UI | [https://project-management-backend-7atu.onrender.com/api/docs](https://project-management-backend-7atu.onrender.com/api/docs) |
| **API Health Check** | Render | [https://project-management-backend-7atu.onrender.com/api/health](https://project-management-backend-7atu.onrender.com/api/health) |
| **Database** | Neon | Neon Serverless PostgreSQL (Multi-AZ, SSL enabled) |

---

## 3. Technology Stack

### Backend REST API (`backend/`)
- **Runtime:** Node.js (v20+)
- **Framework:** Express.js (v5.2.1)
- **Database Driver:** `pg` (node-postgres v8.23.1 connection pool with Neon SSL support)
- **Authentication:** `jsonwebtoken` (v9.0.3) & `bcrypt` (v6.0.0)
- **Security Middleware:** `helmet` (v8.3.0), `cors` (v2.8.6), `express-rate-limit` (v8.7.1)
- **API Documentation:** `swagger-ui-express` (v5.0.1) & `swagger-jsdoc` (v6.3.0) (OpenAPI 3.0)
- **Environment Management:** `dotenv` (v18.0.5)

### Web Frontend (`frontend/`)
- **Core:** React 19 (`19.2.0`), TypeScript (`5.8.3`)
- **Build Engine & Routing:** Vite (`8.1.5`), TanStack Router (`1.170.41`), TanStack Start (`1.168.60` Nitro SSR)
- **Server State Management:** `@tanstack/react-query` (`5.101.1`)
- **Styling & Design System:** Tailwind CSS (`4.2.1`), Radix UI Primitives, Lucide React Icons (`0.575.0`)
- **Notifications:** `sonner` (`2.0.7`)

### Mobile Application (`mobile/`)
- **Framework:** React Native (`0.86.3`) + Expo (`SDK 57.0.27`)
- **Language:** TypeScript (`6.0.3`)
- **Navigation:** `@react-navigation/native` (`7.5.0`), NativeStack (`7.20.0`), Bottom Tabs (`7.20.0`)
- **Secure Storage:** `expo-secure-store` (`57.0.4` — Hardware Keystore on Android / Keychain on iOS)
- **State & Networking:** React Context API (`AuthContext`), Centralized API client with timeout protection and automatic 401 session expiration interceptor
- **Icons & UI:** `@expo/vector-icons` (Ionicons `15.0.2`), `react-native-safe-area-context`

### Relational Database (`database/`)
- **Database Engine:** PostgreSQL 14+ (Local) / Neon PostgreSQL (Production)
- **Schema Design:** 6 Relational Tables (`users`, `projects`, `project_members`, `tasks`, `comments`, `audit_logs`)
- **Custom Enums:** `user_system_role`, `project_status`, `project_role`, `task_status`, `task_priority`

---

## 4. Key Application Features

### 🔐 Authentication & Security
- **User Registration:** Validates full name, email format (RFC 5322 regex), and password complexity ($\ge 8$ characters). Passwords hashed with bcrypt.
- **User Login:** Issues signed JWT with 7-day expiration.
- **Hardware-Backed Mobile Token Storage:** Persistent storage in Android Keystore / iOS Keychain via `expo-secure-store`.
- **Session Auto-Restoration:** Automatically validates session via `GET /api/auth/me` on startup.
- **Automatic 401 Expiration Interceptor:** Invalidated or expired tokens automatically log out and transition user to login screen across Web and Mobile.
- **Cross-Platform Single Sign-On:** Accounts registered on Web log in seamlessly on Mobile, and vice versa.

### 📁 Project Management (Full CRUD)
- **Create Project:** Form with field validation for project name, description, status, and date bounds (`due_date >= start_date`).
- **List & Filter Projects:** Server-side paginated list with real-time task counts, member counts, and status badges.
- **Project Workspace / Details:** Dedicated view displaying project metadata, schedule bounds, and associated tasks.
- **Edit Project:** Inline modal modifying name, description, status, and dates with immediate backend synchronization.
- **Delete Project:** Confirmation dialog enforcing owner permissions with cascade task deletion.
- **Status Lifecycle:** `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`.

### ✅ Task Management (Full CRUD)
- **Create Task:** Assign tasks to projects with title, description, priority, assignee, due date, and estimated hours.
- **List & Filter Tasks:** Filter by project, status (`TODO`, `IN_PROGRESS`, `DONE`), priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), and search terms.
- **Inline Status Toggle:** One-click task completion toggle updating the task status to `DONE` and recording `completed_at`.
- **Edit & Delete Tasks:** Comprehensive task modification and deletion with creator / project-owner permission checks.

### 📊 Real-Time Dynamic Dashboard Analytics
Computed server-side with user-scoped SQL queries:
- **Total Projects:** Count of user-owned and accessible member projects.
- **Total Tasks:** Count of tasks within accessible projects.
- **Completed Tasks:** Count of tasks marked `DONE` or `COMPLETED`.
- **Pending Tasks:** Count of active, non-completed tasks.
- **Projects In Progress:** Count of projects currently in `IN_PROGRESS` status.
- **Task Status Distribution:** Conic gradient chart displaying task status breakdown.
- **Project Progress Tracker:** Real-time completion percentages based on closed child tasks.

---

## 5. Repository Directory Structure

```text
Project_management/
├── backend/                      # Node.js + Express REST API
│   ├── src/
│   │   ├── config/              # PostgreSQL connection pool (Neon SSL) & Swagger OpenAPI
│   │   ├── controllers/         # Request handlers (auth, projects, tasks, dashboard)
│   │   ├── middleware/          # JWT verification, error handler, rate limiter
│   │   ├── routes/              # Express REST routes (/api/auth, /api/projects, /api/tasks, etc.)
│   │   ├── services/            # Database queries with parameterized SQL
│   │   └── utils/               # Bcrypt hashing, JWT helpers, validators
│   ├── tests/                   # 54 automated native node:test suites
│   ├── .env.example             # Backend environment template (DATABASE_URL / DB_*)
│   ├── package.json
│   └── README.md
│
├── frontend/                     # React 19 + TanStack / Vite Web App
│   ├── src/
│   │   ├── components/          # Reusable UI components, dialogs, task lists, forms
│   │   ├── routes/              # TanStack file-based routes (_authenticated.dashboard, etc.)
│   │   ├── services/            # API client and endpoints
│   │   ├── types/               # TypeScript data interfaces (DashboardStats, Project, Task)
│   │   └── lib/                 # Constants, formatters, utilities
│   ├── src/test/                # Vitest test suites (Dashboard mapping, routing, formatters)
│   ├── .env.example             # Frontend environment template (VITE_API_BASE_URL)
│   ├── package.json
│   └── README.md
│
├── mobile/                       # React Native + Expo Mobile Application
│   ├── src/
│   │   ├── components/          # Mobile UI components (Card, Badge, Button, Input)
│   │   ├── constants/           # Spacing, typography, palette, API configuration
│   │   ├── context/             # AuthContext (SecureStore token handling)
│   │   ├── navigation/          # NativeStack & BottomTab navigators
│   │   ├── screens/             # Auth, Dashboard, Projects, Tasks, Profile screens
│   │   ├── services/api/        # Centralized ApiClient & endpoint modules
│   │   ├── types/               # TypeScript API & entity interfaces
│   │   └── utils/               # Validation, SecureStore wrapper, formatters
│   ├── .env.example             # Mobile environment template (EXPO_PUBLIC_API_URL)
│   ├── app.json
│   ├── package.json
│   └── README.md
│
├── database/                     # PostgreSQL Schema & Seed Files
│   ├── schema.sql               # Full DDL: tables, constraints, enums, indexes, triggers
│   ├── seed.sql                 # Sample test data with bcrypt-hashed credentials
│   ├── queries.sql              # Canonical parameterized SQL query reference
│   ├── ER_DIAGRAM.md            # Entity-Relationship diagram & schema documentation
│   └── README.md
│
├── docs/                         # Comprehensive Technical Documentation
│   ├── API.md                   # Full REST API specification & OpenAPI guide
│   ├── FINAL_TEST_REPORT.md     # 105-Point Quality Assurance verification report
│   └── FINAL_RELEASE_CHECKLIST.md # Full assignment compliance verification matrix
│
├── scripts/                      # Automated E2E & Cross-Platform Integration Suites
│   ├── test_phase19_e2e.js      # 27-Point E2E full-stack lifecycle test
│   ├── test_project_crud_e2e.js # 19-Point bidirectional project CRUD test
│   ├── test_stage3_cross_platform_acceptance.js # Web <-> Mobile live sync acceptance
│   └── test_security_isolation_acceptance.js   # 21-Point multi-tenant BOLA security test
│
├── .env.example                  # Consolidated root environment configuration template
├── .gitignore                    # Comprehensive multi-project Git ignore rules
└── README.md                     # Master project documentation
```

---

## 6. Step-by-Step Local Setup Guide

### Prerequisites
- **Node.js:** v20.x or higher
- **PostgreSQL:** v14.x or higher
- **Package Manager:** `npm`
- **Mobile Development (Optional):** Android Studio (Emulator) or physical device with **Expo Go**

---

### Step 1: Clone & Configure Environment Files

```bash
git clone https://github.com/hrbbhagat/Project_management.git
cd Project_management

# Create environment configuration files from templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp mobile/.env.example mobile/.env
```

---

### Step 2: Initialize the PostgreSQL Database

```bash
# Ensure local PostgreSQL is running
# Create database and apply schema
createdb project_management || true
psql "postgresql://postgres:postgres@localhost:5432/project_management" -f database/schema.sql

# Load development seed data
psql "postgresql://postgres:postgres@localhost:5432/project_management" -f database/seed.sql
```

---

### Step 3: Run the Backend REST API

Open **Terminal 1**:
```bash
cd backend
npm install
npm run dev
```
- **API URL:** `http://localhost:5001/api`
- **Health Probe:** `http://localhost:5001/api/health`
- **Interactive Swagger Docs:** `http://localhost:5001/api/docs`

---

### Step 4: Run the React Web Frontend

Open **Terminal 2**:
```bash
cd frontend
npm install
npm run dev
```
- **Web App URL:** `http://localhost:8080`

---

### Step 5: Run the Expo Mobile Application

Open **Terminal 3**:
```bash
cd mobile
npm install
npx expo start
```
- **Android Emulator:** Press `a` in the terminal. *(Automatically routes to `http://10.0.2.2:5001/api`).*
- **Physical Device:** Install **Expo Go** (Android / iOS). Set your machine's Wi-Fi IP in `mobile/.env` (`EXPO_PUBLIC_API_URL=http://192.168.1.X:5001/api`) and scan the QR code.
- **Web Preview:** Press `w` in the terminal.

---

## 7. Default Test Accounts

| User Role | Email | Password | Pre-populated Dataset |
|:---|:---|:---|:---|
| **Admin / Primary User** | `alice.johnson@example.com` | `Password123!` | 1 Project, 4 Tasks |
| **Member User** | `bob.smith@example.com` | `Password123!` | 1 Project, 4 Tasks |
| **Member User** | `charlie.davis@example.com` | `Password123!` | 1 Project, 2 Tasks |

*(You can also register a new account on Web or Mobile at any time).*

---

## 8. REST API Endpoint Reference

| Method | Endpoint | Access | Description |
|:---:|:---|:---:|:---|
| `GET` | `/api/health` | Public | Service health status |
| `GET` | `/api/docs` | Public | Interactive Swagger API documentation |
| `POST` | `/api/auth/register` | Public | Register new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT |
| `POST` | `/api/auth/logout` | Bearer JWT | Stateless client logout confirmation |
| `GET` | `/api/auth/me` | Bearer JWT | Fetch authenticated user profile |
| `GET` | `/api/projects` | Bearer JWT | List projects with search, filter, and pagination |
| `GET` | `/api/projects/:id` | Bearer JWT | Get project details, task count, and members |
| `POST` | `/api/projects` | Bearer JWT | Create new project |
| `PUT` | `/api/projects/:id` | Bearer JWT | Update project details (Owner / Admin) |
| `DELETE` | `/api/projects/:id` | Bearer JWT | Delete project & cascade tasks (Owner only) |
| `GET` | `/api/tasks` | Bearer JWT | List tasks with filters (`project_id`, `status`, `priority`) |
| `GET` | `/api/tasks/:id` | Bearer JWT | Get task details by ID |
| `POST` | `/api/tasks` | Bearer JWT | Create task under project |
| `PUT` | `/api/tasks/:id` | Bearer JWT | Update task fields, status, or assignee |
| `DELETE` | `/api/tasks/:id` | Bearer JWT | Delete task (Creator / Project Owner) |
| `GET` | `/api/dashboard` | Bearer JWT | Get aggregated user-scoped project & task metrics |

---

## 9. Automated Testing & Verification

### Backend Automated Test Suite
```bash
cd backend
npm test
# Executes 54 native node:test suites (Auth, Projects, Tasks, Dashboard, Multi-tenant Security)
# Result: 54/54 PASS (100%)
```

### Frontend Type-Checking & Vitest Suite
```bash
cd frontend
npx tsc --noEmit   # TypeScript Type Check (0 errors)
npm test           # Vitest unit & integration tests (9/9 PASS)
npm run build      # Production Nitro + Vite SSR build (0 errors)
```

### Mobile TypeScript Validation
```bash
cd mobile
npx tsc --noEmit   # Strict TypeScript verification (0 errors)
```

### End-to-End & Security Acceptance Suites
```bash
# Run Master 27-Point E2E Integration Suite
node scripts/test_phase19_e2e.js

# Run 21-Point Multi-Tenant Security & BOLA Isolation Suite
node scripts/test_security_isolation_acceptance.js

# Run Web <-> Mobile Live Cross-Platform Acceptance Suite
node scripts/test_stage3_cross_platform_acceptance.js
```

---

## 10. Security & Compliance Highlights

- **Password Hashing:** Passwords hashed with bcrypt (salt rounds = 10); plaintext passwords are never stored or logged.
- **SQL Injection Defense:** All database queries utilize parameterized `$1, $2, ...` placeholders.
- **BOLA Protection:** Multi-tenant access control ensures users cannot read, edit, or delete projects/tasks owned by another tenant.
- **Brute-Force Rate Limiting:** Authentication routes are protected by rate limiters (100 requests per 15-minute window).
- **Secure Token Storage:** Mobile app uses hardware-backed Keystore/Keychain via `expo-secure-store` to prevent token extraction.
- **Environment Isolation:** Zero credentials, passwords, JWT secrets, or database connection strings are hardcoded in source code or committed to Git.
