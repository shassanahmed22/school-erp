# Bright Future School — School ERP (Part 1: Foundation Layer)

Production-grade foundation for a School ERP built for 1000+ students. This package contains
**only the foundation layer** — authentication, authorization (RBAC), the admin dashboard shell,
theming, multi-language support, settings, user/role/permission management, and audit/activity
logging. Student, Teacher, Attendance, Fees, Exams, Library, Transport, and Parent Portal modules
are intentionally **not** included; they will be built on top of this foundation.

---

## 1. Architecture Overview

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + Shadcn-style UI primitives
- **Forms:** React Hook Form + Zod schema validation
- **State:** Zustand (auth, theme, language, UI state) — persisted where appropriate
- **Backend:** Next.js API Routes (RESTful), TypeScript
- **Database:** PostgreSQL via Prisma ORM (UUID PKs, soft deletes, audit timestamps, indexes)
- **Auth:** JWT (access + refresh) via `jose` (Edge-compatible), httpOnly secure cookies, bcrypt
  password hashing (12 salt rounds)
- **Authorization:** Full RBAC — Roles → RolePermissions → Permissions, embedded into the JWT at
  login so most checks are stateless
- **i18n:** English + Urdu, with RTL support, dictionary-based translator (swappable for
  next-intl/i18next later)
- **Deployment:** Docker multi-stage build + docker-compose (Postgres + App)

## 2. Folder Structure

```
school-erp/
├── prisma/
│   ├── schema.prisma          # Users, Roles, Permissions, RolePermissions, UserRoles,
│   │                           # AuditLogs, ActivityLogs, Settings, Languages
│   └── seed.ts                 # Seeds roles, permissions, default Super Admin, settings
├── src/
│   ├── app/
│   │   ├── (auth)/              # Public: login, forgot-password, reset-password
│   │   ├── (dashboard)/         # Protected: dashboard, users, roles, permissions,
│   │   │                        # settings, audit-logs, activity-logs
│   │   ├── api/                 # REST API routes (auth, users, roles, permissions,
│   │   │                        # settings, audit-logs, activity-logs)
│   │   ├── providers/           # Client-side app providers (theme/i18n/session bootstrap)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                  # Button, Input, Card, Table, Dialog, Select, Tabs, etc.
│   │   ├── layout/               # Sidebar, Navbar, Breadcrumbs, nav-config
│   │   └── shared/               # PageHeader, EmptyState, StatCard, ConfirmDialog, etc.
│   ├── hooks/                    # (reserved for future custom hooks)
│   ├── lib/
│   │   ├── prisma.ts             # Prisma client singleton
│   │   ├── auth.ts               # JWT sign/verify, bcrypt, cookie helpers
│   │   ├── rbac.ts               # Permission-checking helpers (can, canAny, canAll, hasRole)
│   │   ├── api-guard.ts          # requirePermission() wrapper for API routes
│   │   ├── api-response.ts       # Consistent success/failure/paginated JSON responses
│   │   ├── audit.ts              # logAudit() / logActivity() helpers
│   │   ├── i18n/                 # Dictionary-based translator
│   │   └── validators/           # Zod schemas: auth, user, role, permission, settings
│   ├── locales/                  # en.json, ur.json
│   ├── store/                    # Zustand stores: auth, theme, language, ui
│   ├── types/                    # Shared TypeScript types
│   └── middleware.ts             # Route protection (redirects, API 401s)
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

## 3. Database Design

| Model | Purpose |
|---|---|
| `User` | Core account record. Soft-deletable, tracks login metadata, password reset tokens, preferences. |
| `Role` | Named role (Super Admin, Principal, Teacher, etc). `isSystem` roles can't be renamed/deleted. |
| `Permission` | Granular permission, e.g. `users.create`. `module` + `action` composite. |
| `RolePermission` | Join table: which permissions a role grants. |
| `UserRole` | Join table: which roles a user holds (supports multiple roles per user). |
| `AuditLog` | Security-relevant events: logins, CRUD, permission/settings changes, with IP + user agent. |
| `ActivityLog` | Human-readable activity feed for the dashboard timeline. |
| `Setting` | Key/value store grouped by `school` / `system`. |
| `Language` | Available UI languages with direction (ltr/rtl) and default flag. |

All tables use UUID primary keys, `createdAt`/`updatedAt` timestamps, and soft delete
(`deletedAt`) where applicable, with indexes on frequently-queried columns.

**Extending for future modules:** add new Prisma models, then register new permissions in
`prisma/seed.ts` (`PERMISSION_MODULES`) and new nav items in
`src/components/layout/nav-config.ts`. No changes to the auth/RBAC engine are required.

## 4. RBAC Model

Seeded roles: Super Admin, Principal, Vice Principal, Admin Staff, Teacher, Accountant, Student,
Parent, Receptionist, Librarian.

Seeded permissions (foundation layer only): `users.*`, `roles.*`, `permissions.*`,
`settings.*`, `audit-logs.view`, `activity-logs.view`, `reports.view`, `dashboard.view`.

Super Admin is granted every permission automatically and additionally bypasses permission
checks at runtime (`lib/rbac.ts#can`). All other roles start with zero permissions — assign them
via **Roles → Edit → Permissions** in the dashboard.

## 5. Authentication Flow

1. `POST /api/auth/login` verifies credentials, loads the user's roles/permissions, signs a
   15-minute access token and a 7/30-day (remember me) refresh token, and sets both as httpOnly,
   `sameSite=lax` cookies.
2. `middleware.ts` verifies the access token on every request; unauthenticated users are
   redirected to `/login` (pages) or receive a `401` (API routes).
3. `POST /api/auth/logout` clears cookies and writes an audit log entry.
4. `POST /api/auth/forgot-password` issues a single-use, time-limited reset token (does not leak
   whether the email exists).
5. `POST /api/auth/reset-password` validates the token and rehashes the password.
6. `POST /api/auth/change-password` requires the current password and an active session.

> **Production checklist:** set strong, unique `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` values,
> set `COOKIE_SECURE=true` behind HTTPS, wire the forgot-password email to a transactional email
> provider (the `TODO` is marked in `api/auth/forgot-password/route.ts`), and add a rate limiter
> (e.g. Upstash/Redis) in front of `/api/auth/login`.

## 6. API Reference (Foundation Layer)

| Method | Route | Permission |
|---|---|---|
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | authenticated |
| GET | `/api/auth/me` | authenticated |
| POST | `/api/auth/forgot-password` | public |
| POST | `/api/auth/reset-password` | public |
| POST | `/api/auth/change-password` | authenticated |
| GET, POST | `/api/users` | `users.view`, `users.create` |
| GET, PATCH, DELETE | `/api/users/[id]` | `users.view/edit/delete` |
| GET, POST | `/api/roles` | `roles.view`, `roles.create` |
| PATCH, DELETE | `/api/roles/[id]` | `roles.edit/delete` |
| GET, POST | `/api/permissions` | `permissions.view/create` |
| PATCH, DELETE | `/api/permissions/[id]` | `permissions.edit/delete` |
| GET | `/api/audit-logs` | `audit-logs.view` |
| GET | `/api/activity-logs` | `activity-logs.view` |
| GET, PATCH | `/api/settings` | `settings.view`, `settings.manage` |

All responses follow `{ success, message, data, errors? }`; list endpoints return an additional
`pagination` object (`page`, `limit`, `total`, `totalPages`).

## 7. Installation Guide

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or use the provided Docker Compose setup)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit .env: set DATABASE_URL and JWT secrets

# 3. Run database migrations
npx prisma migrate dev --name init

# 4. Seed foundation data (roles, permissions, default Super Admin, settings)
npm run prisma:seed

# 5. Start the dev server
npm run dev
```

Visit `http://localhost:3000` and log in with the seeded Super Admin:

```
Email:    admin@brightfuture.edu
Password: ChangeMe@123
```

**Change this password immediately after first login** (Settings → Security).

## 8. Docker Setup

```bash
# Build and start Postgres + the app together
docker compose up --build

# Run migrations & seed inside the running container
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run prisma:seed
```

The app will be available at `http://localhost:3000`. Update the JWT secrets in
`docker-compose.yml` before deploying anywhere beyond local testing.

## 9. Deployment Guide

1. Provision a managed PostgreSQL instance (RDS, Supabase, Neon, etc).
2. Set production environment variables (`DATABASE_URL`, `JWT_ACCESS_SECRET`,
   `JWT_REFRESH_SECRET`, `COOKIE_SECURE=true`, `NEXT_PUBLIC_APP_URL`).
3. Run `npx prisma migrate deploy` against production before first boot.
4. Build the Docker image (`docker build -t school-erp .`) and deploy to your container platform
   (ECS, Cloud Run, Fly.io, Railway, etc.), or deploy the Next.js app directly (e.g. Vercel) with
   the Postgres instance reachable from it.
5. Put the app behind HTTPS (required for secure cookies) and configure a WAF / rate limiter for
   `/api/auth/*` routes.
6. Point your object storage (S3-compatible) at the school logo upload flow when you wire it up —
   `school.logo` is currently stored as a URL string in `Setting`.

## 10. Troubleshooting

### "Authentication failed against database server at `localhost`" / login fails with 500
This means **no PostgreSQL server is actually running/reachable** at the `DATABASE_URL` in your
`.env` — the app itself is fine, it just can't reach a database. Pick one:

**Option A — Docker (easiest, no local Postgres install needed)**
```bash
docker compose up -d postgres
```
This starts just the database (user: `postgres`, password: `postgres`, db: `school_erp`,
port `5432`) using the credentials already in `.env.example`. Then run:
```bash
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

**Option B — Local PostgreSQL install**
Install PostgreSQL, then create a matching database/user, or edit `DATABASE_URL` in `.env` to
match whatever user/password/db you created, e.g.:
```
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/school_erp?schema=public"
```

**Option C — Free cloud Postgres (Neon / Supabase)**
Create a free database, copy the connection string it gives you into `DATABASE_URL` in `.env`,
then run the migrate + seed commands above.

### "Environment variable not found: DATABASE_URL" when running `npm run prisma:seed`
Fixed as of this version — the seed script now explicitly loads `.env` via `dotenv` (Next.js
loads `.env` automatically for `next dev`, but the standalone `tsx` seed script does not). If you
still hit this, confirm a `.env` file (not just `.env.example`) exists in the project root and
that it isn't empty.

### "Option 'baseUrl' is deprecated" in tsconfig.json
Fixed — `baseUrl` was removed from `tsconfig.json`; the `@/*` path alias works without it under
`moduleResolution: "bundler"`.

### General checklist if login still fails after the database is reachable
1. Did you run `npx prisma migrate dev --name init`? (creates the tables)
2. Did you run `npm run prisma:seed`? (creates the default Super Admin user)
3. Restart `npm run dev` after any `.env` change — Next.js only reads `.env` at server start.

## 11. What's Next (Part 2+)

This foundation intentionally exposes clean extension points for future modules:
- Add Prisma models for Students, Teachers, Classes, Attendance, Fees, Exams, Results, Library,
  Transport, Parents.
- Register new permissions per module in `prisma/seed.ts`.
- Add nav entries in `src/components/layout/nav-config.ts` — the sidebar renders them
  automatically, filtered by the current user's permissions.
- Reuse `requirePermission()`, `api-response.ts`, and the shared UI/table/dialog components for
  consistent CRUD screens across every future module.

---

# PART 2 ADDENDUM — Core Academic Management Layer

## Migration Commands

After pulling this update, run:

```bash
npx prisma generate
npx prisma migrate dev --name add_academic_management_layer
npm run prisma:seed
```

This creates 9 new tables (`academic_years`, `classes`, `sections`, `class_teachers`, `subjects`,
`class_subjects`, `teacher_subjects`, `students`, `student_profiles`, `guardians`,
`student_documents`, `student_history`, `student_enrollments`, `teachers`, `teacher_profiles`,
`teacher_qualifications`, `teacher_documents`) and re-runs the seed script, which now also
creates:
- 1 current academic year (`2025-2026`)
- 6 subjects, 5 classes (Grade 1–5) each with sections A & B, all subjects assigned to every class
- 4 sample teachers (1 with a portal login and made class teacher of Grade 1 - A)
- 10 sample students with guardians, admitted and enrolled into Grade 1 sections (1 with a portal login)

## New Test Accounts

| Role | Email | Password |
|---|---|---|
| Teacher (class teacher, Grade 1-A) | `ayesha.khan@brightfuture.edu` | `Teacher@123` |
| Student (Grade 1-A) | `ahmed.raza.student@brightfuture.edu` | `Student@123` |

Log in as each to see the role-specific dashboard (Admin totals vs. Teacher's class/subjects vs.
Student's own profile/class).

## Testing Steps

1. **Admin flow**: log in as `admin@brightfuture.edu` → Dashboard shows school-wide totals and
   recent admissions → Students → New Admission (fill Personal/Guardian/Academic tabs) → confirm
   the new student appears with an auto-generated `STU-2026-xxxxx` registration number → open the
   profile, change status, add a document.
2. **Teacher flow**: log in as `ayesha.khan@brightfuture.edu` → Dashboard shows "Class Teacher Of:
   Grade 1 - A" and assigned subjects.
3. **Student flow**: log in as `ahmed.raza.student@brightfuture.edu` → Dashboard shows the
   student's own class, roll number, and class teacher.
4. **RBAC check**: create a new user with only the `Teacher` role (Users → Add User) and confirm
   they can view Students/Classes/Subjects but the "Add"/"Delete" buttons are hidden (no
   `students.create`/`students.delete` permission).
5. **Audit trail**: after any create/update/delete above, check Audit Logs — each action should
   appear with the correct `entityType` or with the actor listed in the Activity Logs timeline.

## Deployment Update Guide

Same process as Part 1 (§9), plus:
```bash
# On the production database, before restarting the app:
npx prisma migrate deploy
npm run prisma:seed   # safe to re-run — every seed operation uses upsert / existence checks
```
No changes to `Dockerfile` or `docker-compose.yml` are required — the new API routes and pages
are picked up automatically by the existing Next.js build.
