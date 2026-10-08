-- ==============================================================================
-- Project Management Database Seed Script
-- Realistic development / demo dataset
-- Safe to execute against fresh schema.sql
-- All passwords hash to 'Password123!' (bcrypt cost factor 10)
-- ==============================================================================

BEGIN;

-- 1. USERS
-- Password hash represents 'Password123!' generated with standard bcrypt:
-- $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
INSERT INTO users (id, email, password_hash, full_name, avatar_url, role, is_active)
VALUES
    (
        '11111111-1111-1111-1111-111111111101',
        'alice.johnson@example.com',
        '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        'Alice Johnson',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        'ADMIN',
        TRUE
    ),
    (
        '11111111-1111-1111-1111-111111111102',
        'bob.smith@example.com',
        '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        'Bob Smith',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
        'MEMBER',
        TRUE
    ),
    (
        '11111111-1111-1111-1111-111111111103',
        'charlie.davis@example.com',
        '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        'Charlie Davis',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
        'MEMBER',
        TRUE
    ),
    (
        '11111111-1111-1111-1111-111111111104',
        'diana.prince@example.com',
        '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        'Diana Prince',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        'MEMBER',
        TRUE
    ),
    (
        '11111111-1111-1111-1111-111111111105',
        'evan.wright@example.com',
        '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        'Evan Wright',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7',
        'MEMBER',
        TRUE
    )
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

-- 2. PROJECTS
INSERT INTO projects (id, name, description, status, owner_id, start_date, due_date)
VALUES
    (
        '22222222-2222-2222-2222-222222222201',
        'Cloud Infrastructure Modernization',
        'Migrate legacy monolithic systems to distributed cloud services with zero downtime and automated failover.',
        'IN_PROGRESS',
        '11111111-1111-1111-1111-111111111101',
        '2026-08-01',
        '2026-12-31'
    ),
    (
        '22222222-2222-2222-2222-222222222202',
        'Mobile App 2.0 Redesign',
        'Comprehensive mobile redesign focused on responsive layouts, offline caching, and biometric authentication.',
        'COMPLETED',
        '11111111-1111-1111-1111-111111111104',
        '2026-09-01',
        '2026-11-30'
    ),
    (
        '22222222-2222-2222-2222-222222222203',
        'Real-time Analytics Engine',
        'High-throughput telemetry ingestion pipeline for user behavioral events using streaming partitions.',
        'NOT_STARTED',
        '11111111-1111-1111-1111-111111111102',
        '2026-11-01',
        '2027-03-31'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

-- 3. PROJECT MEMBERS
INSERT INTO project_members (id, project_id, user_id, role, joined_at)
VALUES
    -- Cloud Infrastructure Modernization members
    ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'OWNER', '2026-08-01 09:00:00+00'),
    ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111102', 'ADMIN', '2026-08-02 10:00:00+00'),
    ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111105', 'MEMBER', '2026-08-05 14:00:00+00'),

    -- Mobile App 2.0 Redesign members
    ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111104', 'OWNER', '2026-09-01 09:00:00+00'),
    ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111103', 'ADMIN', '2026-09-02 11:30:00+00'),
    ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'MEMBER', '2026-09-03 14:15:00+00'),
    ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111105', 'VIEWER', '2026-09-04 16:00:00+00'),

    -- Real-time Analytics Engine members
    ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111102', 'OWNER', '2026-11-01 09:00:00+00'),
    ('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101', 'ADMIN', '2026-11-02 10:00:00+00'),
    ('33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', 'MEMBER', '2026-11-03 11:00:00+00')
ON CONFLICT (project_id, user_id) DO UPDATE SET
    role = EXCLUDED.role;

-- 4. TASKS
INSERT INTO tasks (id, project_id, title, description, status, priority, assigned_to, created_by, due_date, estimated_hours, completed_at, created_at)
VALUES
    -- Project 1 Tasks
    (
        '44444444-4444-4444-4444-444444444401',
        '22222222-2222-2222-2222-222222222201',
        'Design PostgreSQL schema and partition strategy',
        'Create optimized schema with range partitioning for timeseries telemetry logs.',
        'COMPLETED',
        'HIGH',
        '11111111-1111-1111-1111-111111111102',
        '11111111-1111-1111-1111-111111111101',
        '2026-09-15 18:00:00+00',
        16.00,
        '2026-09-14 17:30:00+00',
        '2026-09-02 09:00:00+00'
    ),
    (
        '44444444-4444-4444-4444-444444444402',
        '22222222-2222-2222-2222-222222222201',
        'Configure Terraform scripts for multi-region RDS',
        'Provision infrastructure as code with automated failover and read replicas in eu-central-1 and us-east-1.',
        'IN_PROGRESS',
        'URGENT',
        '11111111-1111-1111-1111-111111111102',
        '11111111-1111-1111-1111-111111111101',
        '2026-10-15 18:00:00+00',
        24.00,
        NULL,
        '2026-09-10 10:00:00+00'
    ),
    (
        '44444444-4444-4444-4444-444444444403',
        '22222222-2222-2222-2222-222222222201',
        'Implement automated backup verification',
        'Set up cron jobs to restore daily snapshots into ephemeral containers to verify backup integrity.',
        'PENDING',
        'MEDIUM',
        '11111111-1111-1111-1111-111111111105',
        '11111111-1111-1111-1111-111111111102',
        '2026-10-28 18:00:00+00',
        12.00,
        NULL,
        '2026-09-12 11:30:00+00'
    ),
    (
        '44444444-4444-4444-4444-444444444404',
        '22222222-2222-2222-2222-222222222201',
        'Run disaster recovery drill on staging',
        'Simulate primary DB node failure and measure time-to-recovery (RTO) and data loss (RPO).',
        'BLOCKED',
        'HIGH',
        '11111111-1111-1111-1111-111111111105',
        '11111111-1111-1111-1111-111111111101',
        '2026-10-01 12:00:00+00', -- Deliberately overdue for test queries
        8.00,
        NULL,
        '2026-09-15 14:00:00+00'
    ),

    -- Project 2 Tasks
    (
        '44444444-4444-4444-4444-444444444405',
        '22222222-2222-2222-2222-222222222202',
        'Create mobile design tokens in Figma',
        'Define color tokens, typography scales, spacing units, and dark mode color contrast ratios.',
        'COMPLETED',
        'MEDIUM',
        '11111111-1111-1111-1111-111111111103',
        '11111111-1111-1111-1111-111111111104',
        '2026-09-22 18:00:00+00',
        20.00,
        '2026-09-21 16:45:00+00',
        '2026-09-05 10:00:00+00'
    ),
    (
        '44444444-4444-4444-4444-444444444406',
        '22222222-2222-2222-2222-222222222202',
        'Develop offline-first local cache layer',
        'Implement client-side SQLite/IndexedDB synchronization engine with conflict resolution heuristics.',
        'IN_PROGRESS',
        'HIGH',
        '11111111-1111-1111-1111-111111111103',
        '11111111-1111-1111-1111-111111111104',
        '2026-10-20 18:00:00+00',
        32.00,
        NULL,
        '2026-09-10 14:30:00+00'
    ),
    (
        '44444444-4444-4444-4444-444444444407',
        '22222222-2222-2222-2222-222222222202',
        'Build biometric authentication workflow',
        'Implement FaceID and fingerprint native biometric prompt with secure token keychain storage.',
        'IN_REVIEW',
        'URGENT',
        '11111111-1111-1111-1111-111111111102',
        '11111111-1111-1111-1111-111111111104',
        '2026-10-12 18:00:00+00',
        18.00,
        NULL,
        '2026-09-12 16:00:00+00'
    ),
    (
        '44444444-4444-4444-4444-444444444408',
        '22222222-2222-2222-2222-222222222202',
        'End-to-end regression test suite on iOS and Android',
        'Automate smoke and regression tests using Appium and Maestro test runners.',
        'PENDING',
        'MEDIUM',
        '11111111-1111-1111-1111-111111111105',
        '11111111-1111-1111-1111-111111111103',
        '2026-11-15 18:00:00+00',
        25.00,
        NULL,
        '2026-09-18 09:30:00+00'
    ),
    (
        '44444444-4444-4444-4444-444444444409',
        '22222222-2222-2222-2222-222222222202',
        'Audit WCAG 2.1 AA accessibility compliance',
        'Check screen reader announcements, focus traps, and touch targets across all mobile views.',
        'PENDING',
        'LOW',
        NULL, -- Unassigned task
        '11111111-1111-1111-1111-111111111104',
        '2026-09-30 18:00:00+00', -- Overdue and unassigned
        10.00,
        NULL,
        '2026-09-20 11:00:00+00'
    ),

    -- Project 3 Tasks
    (
        '44444444-4444-4444-4444-444444444410',
        '22222222-2222-2222-2222-222222222203',
        'Benchmark Apache Kafka vs Redpanda throughput',
        'Deploy test cluster and measure P99 latency at 100k events/sec under consumer rebalancing.',
        'IN_PROGRESS',
        'HIGH',
        '11111111-1111-1111-1111-111111111102',
        '11111111-1111-1111-1111-111111111102',
        '2026-11-20 18:00:00+00',
        40.00,
        NULL,
        '2026-09-25 15:00:00+00'
    ),
    (
        '44444444-4444-4444-4444-444444444411',
        '22222222-2222-2222-2222-222222222203',
        'Define event payload JSON schemas',
        'Establish JSON Schema contracts and register in schema registry with backwards compatibility checks.',
        'PENDING',
        'MEDIUM',
        '11111111-1111-1111-1111-111111111103',
        '11111111-1111-1111-1111-111111111102',
        '2026-11-25 18:00:00+00',
        14.00,
        NULL,
        '2026-09-28 17:00:00+00'
    )
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    status = EXCLUDED.status,
    priority = EXCLUDED.priority,
    assigned_to = EXCLUDED.assigned_to;

-- 5. COMMENTS
INSERT INTO comments (id, task_id, user_id, content, created_at)
VALUES
    (
        '55555555-5555-5555-5555-555555555501',
        '44444444-4444-4444-4444-444444444402',
        '11111111-1111-1111-1111-111111111102',
        'Terraform modules for multi-AZ RDS Aurora PostgreSQL 15 cluster are drafted. Running dry runs in staging sandbox.',
        '2026-10-02 10:15:00+00'
    ),
    (
        '55555555-5555-5555-5555-555555555502',
        '44444444-4444-4444-4444-444444444402',
        '11111111-1111-1111-1111-111111111101',
        'Please ensure AWS KMS customer-managed keys (CMK) are enabled for storage encryption at rest before merging.',
        '2026-10-02 11:30:00+00'
    ),
    (
        '55555555-5555-5555-5555-555555555503',
        '44444444-4444-4444-4444-444444444404',
        '11111111-1111-1111-1111-111111111105',
        'Blocked: Waiting for security team to grant scoped IAM role to terminate staging instances during simulated outage.',
        '2026-10-01 14:00:00+00'
    ),
    (
        '55555555-5555-5555-5555-555555555504',
        '44444444-4444-4444-4444-444444444407',
        '11111111-1111-1111-1111-111111111102',
        'PR #142 submitted for review. Implemented biometric prompt with secure enclave key storage and PIN fallback.',
        '2026-10-05 09:45:00+00'
    ),
    (
        '55555555-5555-5555-5555-555555555505',
        '44444444-4444-4444-4444-444444444407',
        '11111111-1111-1111-1111-111111111103',
        'Reviewing PR #142 now. Testing edge case where user revokes biometric permissions while app is backgrounded.',
        '2026-10-05 13:20:00+00'
    )
ON CONFLICT (id) DO UPDATE SET
    content = EXCLUDED.content;

COMMIT;
