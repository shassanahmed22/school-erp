# School ERP — Security & Performance Audit Report (Updated)

**This supersedes the previous `AUDIT_REPORT.md`.** Everything from that report's Section G that could realistically be fixed in code has now been addressed. What's left is listed honestly at the bottom — nothing is claimed as done that wasn't actually built.

---

## What Was Added In This Pass

### 1. IP-based rate limiting
`src/lib/rate-limit.ts` — a sliding-window limiter keyed by IP address, checked at the top of `login/route.ts` before any database work happens. 20 attempts per IP per 15 minutes, across all accounts combined (deliberately more lenient than the per-account lockout, since a school's shared network can generate many legitimate logins from one IP).

**Honest limitation:** this is in-memory, so it only works correctly for a single server instance. If this app is ever deployed across multiple instances behind a load balancer, each instance tracks its own counts — that would need a shared store (Redis) instead. This is documented in the file itself.

### 2. Guardian bulk-linking tool
- `POST /api/students/bulk-link-guardians` — accepts up to 500 rows of `(registration number, guardian phone, parent email)`, batch-resolves students/guardians/parent accounts (2 queries total, not one per row), and links them.
- New page `/students/bulk-link-guardians` — paste-a-CSV-style UI with per-row success/failure results, reachable via a "Bulk-Link Parents" button on the Students list page.
- The single-guardian linking UI from the previous pass (on each student's profile) is still there for one-off links.

### 3. Per-device session revocation
This was the biggest gap, and now has a real implementation instead of the previous "invalidate everything" tokenVersion approach:
- New `UserSession` model — one row per device, tracking device info, IP, last-used time, and revocation status
- Refresh tokens now carry a `jti` (session ID) claim; every login creates a session row, every silent refresh rotates the row in place (not a new row every 12 minutes — same row, updated), so the sessions list stays accurate instead of growing unbounded
- Logout now revokes that specific device's session row, not just the cookies
- Password change/reset still bump `tokenVersion` (kills everything at once, as before) **and** now also explicitly revoke all session rows
- New `GET /api/auth/sessions` (list your active devices) and `DELETE /api/auth/sessions/[id]` (sign out one device, with an ownership check so you can never revoke someone else's session)
- New **Settings → Security → Active Sessions** UI — shows device type, IP, last-active time, marks "This device", and a "Sign Out" button for every other device

### 4. `select` optimization pass
Checked `students`, `teachers`, `users`, and `employees` list endpoints (the four highest-traffic list views). Found and fixed real over-fetching in three of them:
- **`students` list:** was using `include` (fetches every column) at both the top level and for the nested `section` relation. Now uses `select` throughout — only the ~8 fields the response actually maps.
- **`teachers` list:** same issue, same fix.
- **`users` list:** was fetching the *entire* User row per list item — including `passwordHash` and the (now-hashed, but still shouldn't be pulled unnecessarily) `passwordResetToken` — into server memory for every page load, even though none of it reached the client. Now selects only the 8 fields actually used.
- `employees` list was already lean (`select` used correctly) — no change needed.

**Honest limitation:** this was 4 endpoints, not all 116. See remaining items below.

### 5. Bundle-size / re-render audit
**Not performed as a real profiling exercise** — that needs the app actually running with React DevTools attached, which isn't possible in this sandbox. What I could and did do instead: confirm there's no obviously wasteful pattern like importing an entire icon library as a namespace, or client components with no interactivity that could trivially be server components without a larger restructure. This is a static skim, not a profile — flagged honestly in the list below rather than claimed as complete.

---

## Full Current State — Nothing Hidden

### Actually fixed and verified by reading the code (both this session and the previous one)
- 8 unprotected admin pages → server-side guarded
- Missing `/api/auth/refresh` → built, with fresh permission reload every cycle
- No brute-force protection → per-account lockout (5 attempts/15 min) **and** per-IP rate limit (20/15 min)
- Plaintext password-reset tokens → hashed
- No forced password change on first login → `mustChangePassword` + middleware enforcement
- No session invalidation on password change → `tokenVersion` bump + explicit session-row revocation
- Attendance API had zero self-scoping (any student could read any student's data) → fixed
- Parent role could see every student's results/fees/payments, not just their own child's → `Guardian.userId` linking + `resolveStudentScope()` helper, applied to attendance/results/student-fees/fee-payments
- No way to actually link a parent account to a child → single-link UI (previous pass) + bulk-link tool (this pass)
- No per-device session visibility/revocation → built in full, described above
- 4 real N+1 query patterns (dashboard, bulk fee assignment, results computation, payroll generation) → fixed
- Over-fetching in students/teachers/users list APIs → fixed

### Still genuinely remaining (honest, not glossed over)

**Cannot be fixed in this environment — needs your machine or a real deployment:**
1. **Never build-tested.** `npm run build` / `npx prisma validate` / `npx prisma migrate dev` have never actually run against any of these changes — this sandbox can't reach the Prisma engine binary host. Run them locally (commands below) before trusting this in production.
2. **No live login/click-through testing of any role, including the custom "Examination Officer" role test.** No running database exists in this sandbox. The dynamic-role architecture was verified by reading the permission-check code path, not by actually creating a role and logging in as it.
3. **No real profiling.** The bundle-size/re-render item above is a static skim, not a measurement. If load times are still slow after these fixes, the next step is running the app with `next build --profile` and the React DevTools Profiler while actually clicking through it — that can only happen outside this sandbox.

**Deliberately scoped out — would need a larger, separate decision to tackle:**
4. **Only 4 of 116 API routes got the `select` treatment.** The rest weren't individually audited for over-fetching. Worth a dedicated pass if specific pages feel slow.
5. **IP rate limiting is in-memory, single-instance only** (see above) — fine for a typical single-server school deployment, not fine if this ever runs on multiple instances behind a load balancer without a shared store.
6. **The whole app's data-fetching architecture is `"use client"` + `useEffect` + `fetch`** on nearly every page, rather than Server Component data loading. This is consistent everywhere, not a bug in one file, and converting it would be a large rewrite touching essentially every page in the app — intentionally not attempted, given the standing instruction not to break working functionality for a change this size.
7. **No full database index review.** Only the fields the new scoping/session code directly filters on (`Guardian.userId`, `UserSession.tokenId`/`userId`) were indexed. A systematic "what's missing an index" pass across all 95 models wasn't done.
8. **Rate limiting is login-only.** `forgot-password` currently has no rate limit at all, meaning someone could spam reset emails to a real address. Worth adding if this becomes a live concern.

---

## Commands To Run (in order)

```bash
npm install --legacy-peer-deps
npx prisma migrate dev --name sessions_rate_limit_bulk_link_and_select_optimization
npx prisma db seed
npm run build
npm run dev
```

### Manual verification checklist
1. Log in on two different browsers (or one normal + one incognito window) with the same account → open **Settings → Security → Active Sessions** on one → confirm you see both devices, with "This device" correctly marking the one you're on
2. Click "Sign Out" on the *other* device's session → refresh that other browser tab → confirm it gets logged out within ~15 minutes (or immediately on its next action)
3. Go to **Students → Bulk-Link Parents** → paste a few real rows → confirm the per-row success/failure list is accurate
4. Try logging in with a wrong password 21+ times from the same browser quickly → confirm you eventually get the "too many attempts from this network" message (429) rather than the normal invalid-credentials message
5. Open the Students list and Users list in the Network tab → confirm the response payloads are visibly smaller / don't contain fields like `passwordHash`

---

## Addendum — Auto-Generated Credentials & Settings Access Fix

### Settings access bug (real, found and fixed)
`settings.manage` (needed to save School/System settings) had **never been assigned to any role, including Principal** — only `settings.manage` existing as a definable permission, unassigned. This meant nobody but Super Admin could actually save settings, while the School/System tabs were still visible in the UI to every authenticated user (since the page wasn't hard-gated, so people could see the form even though submitting it would fail). Fixed:
- Principal now has `settings.manage`
- The School/System tabs are now hidden client-side from anyone without `settings.manage` — only the Security (change password / sessions) tab shows for everyone else
- The API-level guard was already correct (`requirePermission("settings.manage")` on `PATCH /api/settings`) and is unchanged

### Auto-generated portal credentials on creation
Previously, creating a Student, Guardian, or Teacher record never created an actual login account — `userId` stayed null forever unless someone separately went through the Users module. Now:

- **Creating a student** automatically creates their portal login (`student` role), using their own email if provided, otherwise a synthetic one built from their registration number. Temporary password is randomly generated, bcrypt-hashed, and `mustChangePassword` is set so they're forced to choose their own on first login.
- **Each guardian with an email** gets a `parent`-role account automatically linked to that specific child (via `Guardian.userId`, the same field the earlier IDOR fix scopes parent data access by). If a guardian's email already belongs to an existing account (e.g. the same parent has another child at the school), it reuses that account instead of creating a duplicate login — sibling accounts correctly see both children.
- **Creating a teacher** automatically creates their portal login (`teacher` role) using their email.
- All of this returns the generated email + temporary password **once**, in the API response — the new `CredentialsDialog` component shows it to the admin right after creation with a copy button and a clear "shown only once" warning. Nothing is stored in plaintext anywhere after that response.
- **Bug fixed along the way:** editing a student's guardians previously used a delete-all-and-recreate approach, which would have silently destroyed every guardian's linked parent account on every single student edit. Guardian updates are now reconciled by phone number instead, preserving existing account links.

### Scope note
This was built for Students, Guardians/Parents, and Teachers specifically, matching what was asked for. HR employees were deliberately left out of this pass — unlike Teacher/Student/Parent, an Employee doesn't map to one obvious role (could be Accountant, Librarian, HR Manager, etc.), so auto-assigning a role there would be a guess rather than a safe default. HR-created staff should continue to get accounts through the Users module where the role is chosen explicitly.

### Still not build-tested
As with everything else in this project, this was written and integrity-checked (imports resolve, braces balance) but never actually compiled or run — the same sandbox limitation as before. Test the full admission → credentials → login flow locally after running the migration.
