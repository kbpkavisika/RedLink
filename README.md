# RedLink 🩸

[![CI](https://github.com/kbpkavisika/RedLink/actions/workflows/ci.yml/badge.svg)](https://github.com/kbpkavisika/RedLink/actions/workflows/ci.yml)

A blood donor matching and request management system that connects hospitals with suitable blood donors.

RedLink lets a hospital post a request and instantly get a ranked list of compatible, available donors nearby, turning a manual search into a database query.

> **Status: early development.** The project skeleton is in place: React frontend, Spring Boot API and PostgreSQL. The full database schema is created by Flyway, the API has its service layer and error handling, and authentication works: registration for donors and hospitals, JWT sign-in, role rules, password change and the first-admin seeder. The frontend has its design system, app shell and role-based routing; its sign-in and registration pages come next. Everything else below describes the target design. See [Roadmap](#roadmap) for what is built and what is planned.

---

## Table of Contents

- [The Problem](#the-problem)
- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Frontend](#frontend)
- [Database Design](#database-design)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Testing the API](#testing-the-api)
- [Scripts](#scripts)
- [Development Workflow](#development-workflow)
- [Roadmap](#roadmap)

---

## The Problem

When a hospital needs blood urgently, staff often call donors one by one. Many of those donors have the wrong blood type, are still inside their post-donation waiting period, or live in another city. Every wasted call costs time in an emergency.

**RedLink's solution:** a hospital creates a blood request (blood type, units, urgency, city). The system finds every donor whose blood type is compatible, removes anyone unavailable or ineligible, ranks the rest, and notifies the best matches. Each donor can then accept or decline in the app.

---

## Features

Three roles, each with its own view of the system.

| Role | Can do |
|---|---|
| **Admin** | Approve or reject hospital registrations (with a reason), manage users, add staff to a hospital, reset a user's password, view all requests |
| **Hospital staff** | Register their hospital, create blood requests, view matched donors, track responses (including withdrawals), mark requests fulfilled or cancelled |
| **Donor** | Manage profile and availability, view incoming requests, accept or decline, withdraw after accepting, see donation history |

Every user can also change their own password.

### Core business rules

1. A hospital account must be **approved by an admin** before it can post requests.
2. A donor is **eligible** only if they are marked available **and** at least **90 days** have passed since their last donation.
3. A donor **responds to a request once** (accept or decline). After accepting, they may **withdraw** while the request is still open, but they cannot respond to it again.
4. A request starts as `OPEN` and ends as `FULFILLED`, `CANCELLED` or `EXPIRED`. A closed request cannot be reopened.
5. When a request is posted, the system notifies the **top-ranked matches**: `units needed × urgency multiplier`, capped at 25. If there are fewer matches than that, all of them are notified.
6. Registering a hospital also creates its **first staff account**. The admin adds any further staff.
7. The **first admin is created automatically** at startup from environment variables. Nobody can register themselves as an admin.
8. **Password reset by email is not in v1.** An admin sets a temporary password, and the user changes it after logging in.

---

## How It Works

### Main flow: from request to donation

```mermaid
sequenceDiagram
    actor H as Hospital staff
    participant API as RedLink API
    participant DB as PostgreSQL
    actor D as Donor

    H->>API: POST /api/requests (blood group, units, urgency, city)
    API->>API: Check hospital is APPROVED
    API->>DB: Save request (status OPEN)
    API->>DB: Find compatible, available, eligible donors
    API->>API: Rank matches
    API->>DB: Create notifications for top matches
    D->>API: GET /api/donor/requests
    D->>API: POST /api/requests/{id}/responses (ACCEPTED / DECLINED)
    API->>DB: Save response (one per donor per request)
    opt Donor can't make it
        D->>API: PATCH /api/requests/{id}/responses/me → WITHDRAWN
        API->>DB: Update response, notify hospital staff
    end
    H->>API: GET /api/requests/{id}/responses
    H->>API: PATCH /api/requests/{id}/status → FULFILLED
    API->>DB: Record donation, update donor's last donation date
```

### Hospital onboarding

```
Hospital registers ──► status PENDING ──► Admin reviews ──┬──► APPROVED  (can post requests)
                                                          └──► REJECTED  (cannot post, reason shown)
```

One registration form creates both the hospital (`PENDING`) and its first staff user (`HOSPITAL_STAFF`) in a single transaction. If the email or registration number already exists, nothing is saved.

The staff user can log in at every stage, so they always see where their hospital stands:

| Hospital status | What staff see | Can post requests? |
|---|---|:---:|
| `PENDING` | "An admin is reviewing your registration. This usually takes 1–2 working days." | ❌ |
| `APPROVED` | Full dashboard | ✅ |
| `REJECTED` | "Registration was not approved", with the admin's reason | ❌ |

Further staff accounts are created by the admin in **Users → Add staff user** (approved hospitals only), with a temporary password the admin passes on. A decision on a hospital is final: an approved or rejected hospital can't be reviewed again.

### Accounts and passwords

- **First admin:** when the backend starts, a seeder checks whether any admin exists. If none does, it creates one from `redlink.admin.email` and `redlink.admin.password` (`application-local.properties` locally, `REDLINK_ADMIN_EMAIL` / `REDLINK_ADMIN_PASSWORD` when deployed). The password is never committed, and the admin must change it at first sign-in. If the settings are missing, the app logs a warning; if they're invalid, it refuses to start.
- **Registration** only creates `DONOR` or `HOSPITAL_STAFF` users. Any `role` sent in the request body is ignored. New users are signed in straight away.
- **Donors** must be 18 to 60 years old when they register.
- **Emails** are trimmed and lowercased everywhere, so `Kamal@Mail.lk` and `kamal@mail.lk` are the same account.
- **Forgotten password (v1):** the "Forgot password?" link tells the user to contact the admin. The admin sets a temporary password, and `must_change_password` makes the user choose a new one at their next login.

See [Authentication](#authentication) for how tokens and roles work.

### Request lifecycle

```
            ┌──► FULFILLED   (hospital got the blood it needed)
  OPEN ─────┼──► CANCELLED   (hospital withdrew the request)
            └──► EXPIRED     (needed-by date passed with no fulfilment)
```

### Donor response lifecycle

```
            ┌──► ACCEPTED ──► WITHDRAWN   (donor can't make it after all)
 no reply ──┤
            └──► DECLINED
```

- Each donor has **at most one** response per request. Withdrawing updates that row; it never adds a new one.
- Only `ACCEPTED` → `WITHDRAWN` is allowed, and only while the request is `OPEN`. `DECLINED` and `WITHDRAWN` are final.
- When a donor withdraws, the hospital's staff are notified ("Kamal Perera can no longer donate for #RQ-5").

| Invalid action | API response |
|---|---|
| Responding a second time | `409 Conflict`: "You've already responded to this request." |
| Withdrawing a declined response | `409 Conflict`: "Only accepted responses can be withdrawn." |
| Withdrawing after the request closed | `409 Conflict`: "This request is already closed." |

### Matching engine

For a request with blood group **R** in city **C**, a donor is a match when **all** of the following are true:

| Check | Rule |
|---|---|
| Compatible | Donor's blood group can be given to **R** (table below) |
| Available | `donors.available = true`, and the donor's account is enabled |
| Eligible | `last_donation_date` is empty **or** at least 90 days ago |
| Not already responded | No row in `donor_responses` for this donor and request (accepted, declined or withdrawn) |

Matches are **ranked** by:
1. Exact blood group match before a compatible substitute (this saves scarce types such as O−)
2. Same city as the request before other cities. Cities are compared ignoring case and extra spaces, so `colombo` and `Colombo ` are the same city
3. Longest time since last donation first; never donated counts as longest
4. Then donor ID, so the order is the same every time

The filters run in one database query (`DonorRepository.findMatchCandidates`); the ranking is `MatchRanking`, which has no database access so it can be unit tested exactly. A closed request (fulfilled, cancelled or expired) has no matches.

**How many donors are notified.** Not every match is notified, so donors aren't flooded with requests that will be filled without them:

```
notified = min(units_needed × urgency multiplier, 25, number of matches)
```

| Urgency | Multiplier | 1 unit | 2 units | 4 units |
|---|:---:|:---:|:---:|:---:|
| `LOW` | 2 | 2 | 4 | 8 |
| `MEDIUM` | 3 | 3 | 6 | 12 |
| `HIGH` | 5 | 5 | 10 | 20 |
| `CRITICAL` | 8 | 8 | 16 | 25 (cap) |

Example: 2 units of A+ at `HIGH` urgency with 46 matches notifies the top 10. The other 36 still appear in the hospital's ranked match list, so staff can contact them directly. If there are no matches, the request is still saved and the hospital sees suggestions instead.

The multipliers and cap live in `application.properties` (`MatchingProperties`), so they can be tuned without code changes. A missing or non-positive value stops the app at startup:

```properties
redlink.matching.multiplier.low=2
redlink.matching.multiplier.medium=3
redlink.matching.multiplier.high=5
redlink.matching.multiplier.critical=8
redlink.matching.max-notified=25
```

**Red cell compatibility** (who a recipient can receive from):

| Recipient | Compatible donors |
|---|---|
| O− | O− |
| O+ | O+, O− |
| A− | A−, O− |
| A+ | A+, A−, O+, O− |
| B− | B−, O− |
| B+ | B+, B−, O+, O− |
| AB− | AB−, A−, B−, O− |
| AB+ | All groups |

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + TypeScript (Vite) | Component-based UI, type safety, largest job market |
| Backend | Java 25 + Spring Boot 4.1 | Strong OOP, dependency injection, dominant in enterprise Java |
| Data access | Spring Data JPA (Hibernate) | Less boilerplate; entities map directly to relationships |
| Auth | Spring Security 7 + JWT (OAuth2 resource server, HS256), BCrypt passwords | Stateless, suits a separate frontend, scales without shared session storage |
| Database | PostgreSQL | Relational data with real constraints and transactions |
| API style | REST + JSON | Simple, testable in Postman, universal |
| CI/CD | GitHub Actions (CI live, CD planned) | Tests gate every merge and deploy |
| Hosting | Vercel (frontend), Render (API), Neon (PostgreSQL) *(planned)* | Free tiers suitable for a portfolio project |

Frontend libraries: React Router, Axios, TanStack Query, React Hook Form + Zod, Tailwind CSS, Lucide icons, clsx, Recharts, React Hot Toast.

---

## Architecture

RedLink is a **layered monolith**: one Spring Boot application split into Controller → Service → Repository layers, backed by one PostgreSQL database, with a separate React single-page frontend.

```
┌──────────────────┐   HTTP/JSON   ┌───────────────────────── Spring Boot ─────────────────────────┐
│ React + TS (SPA) │ ────────────► │ Controller ──► Service ──► Repository ──► │ PostgreSQL │
│  localhost:5173  │  Bearer JWT   │  (HTTP only)   (rules)     (JPA)          │   :5432    │
└──────────────────┘               └──────────────── localhost:8080 ───────────────────────────────┘
```

| Layer | Responsibility | Never does |
|---|---|---|
| **Controller** | HTTP only: validates the request DTO with `@Valid`, calls **one** service method, returns the result | Business rules or repository calls |
| **Service** | Business rules, transactions (`@Transactional`, read-only by default), entity ↔ DTO mapping; throws `ApiException`s | Anything HTTP (`ResponseEntity`, status codes) |
| **Repository** | Spring Data JPA queries | Business logic |
| **DTO** | Java `record`s for what goes in and out of the API, so entities are never exposed | Behaviour |
| **Exception handler** | `GlobalExceptionHandler` turns every error into the one [error format](#error-format) | Business logic |

`DonorController` → `DonorService` → `DonorRepository` is the reference example to copy for new features.

**Rules that keep the layers honest**

- Request DTOs contain only the fields a client may set. A registration DTO has no `role` field, so nobody can make themselves an admin.
- Field rules (not blank, positive, email format) are annotations on the request DTO. Rules that need data ("email already registered", "hospital not approved") live in the service.
- `spring.jpa.open-in-view=false`: the database connection closes when the service method ends, so lazy-loading an entity outside a service fails loudly. Load what you need in the service (e.g. `join fetch`) and return a DTO.

### Error format

Every error, from any endpoint, has the same JSON shape:

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Some fields are invalid.",
  "fieldErrors": [
    { "field": "unitsNeeded", "message": "must be greater than 0" }
  ],
  "ref": "7f3a-19c2",
  "timestamp": "2026-09-30T10:15:00Z",
  "path": "/api/requests"
}
```

| Field | Use in the frontend |
|---|---|
| `message` | Plain sentence shown to the user |
| `fieldErrors` | Message under each invalid form field (empty when not a form error) |
| `ref` | Shown as `Error 500 · ref 7f3a-19c2`. The same ref is in the server log, so a reported ref leads to the exact error |
| `status` | Decides the screen state: 403 → Blocked, 409 → inline message, 5xx → Error with "Try again" |

Services signal expected problems by throwing one of these; the handler picks the status:

| Exception | Status | Example |
|---|---|---|
| `NotFoundException` | 404 | "Donor 99 was not found." |
| `ConflictException` | 409 | "You've already responded to this request." |
| `ForbiddenException` | 403 | "Posting unlocks after an admin approves your hospital." |
| `BadRequestException` | 400 | "Rejecting a hospital requires a reason." |

The handler also covers invalid fields (400), broken JSON or an unknown value such as `"bloodGroup": "C+"` (400), a non-numeric ID (400), unknown URLs (404), wrong HTTP methods (405), non-JSON bodies (415) and database constraint conflicts (409). Anything unexpected returns 500 with a generic message; stack traces, SQL and class names never reach the client and are logged with the `ref` instead.

### Authentication

Every request passes through Spring Security before it reaches a controller:

```
Authorization: Bearer <token>
   → signature, expiry and issuer checked ── bad or missing ──► 401
   → role read from the token
   → URL rules checked ───────────────────── not allowed ────► 403
   → controller → service (which may still say 403, e.g. hospital not approved yet)
```

**Tokens.** `POST /api/auth/login` (or registration) returns a signed JWT. It contains only the user id (`sub`), `role`, issuer and expiry: no personal data, because anyone can read a JWT's payload (they just can't change it without the secret). It lasts **12 hours**, or **7 days** with `"rememberMe": true`. The server keeps no sessions.

**Role rules** (first match wins):

| Path | Who |
|---|---|
| `POST /api/auth/login`, `POST /api/auth/register/**` | Anyone |
| `/api/admin/**`, `/api/donors/**` | `ADMIN` |
| `/api/donor/**` | `DONOR` |
| `POST /api/requests/{id}/responses`, `PATCH /api/requests/{id}/responses/me` | `DONOR` |
| `/api/requests/**` (everything else) | `HOSPITAL_STAFF` |
| Everything else | Any signed-in user |

`/api/requests` is shared: staff create and manage requests, donors respond to them. That's why the two donor endpoints are listed before the staff rule. **Hospital approval is not a role:** a staff member of a `PENDING` hospital is signed in, and the service refuses to post with a 403.

**Security details**

- Passwords are hashed with **BCrypt** (stored as `{bcrypt}$2a$10$…`), never stored as text.
- Wrong password and unknown email get the **same** 401 message and take about the same time, so nobody can find out which emails are registered. A disabled account is only revealed after the right password.
- Each request loads the user from the database, so **disabling an account stops its token** on the next request.
- 401 and 403 use the same [error format](#error-format) as every other error. A 401 makes the frontend sign the user out; a 403 doesn't.
- CSRF protection is off because the token travels in a header, not a cookie. CORS only allows origins listed in `redlink.cors.allowed-origins` (empty in development, where the Vite proxy is used).

**Settings** (secrets are never committed):

| Setting | Where | Notes |
|---|---|---|
| `redlink.jwt.secret` | `application-local.properties` / `REDLINK_JWT_SECRET` | **Required**, at least 32 characters. The app won't start without it |
| `redlink.jwt.expiry`, `redlink.jwt.remember-me-expiry` | `application.properties` | `12h`, `7d` |
| `redlink.admin.email`, `redlink.admin.password` | `application-local.properties` / `REDLINK_ADMIN_EMAIL`, `REDLINK_ADMIN_PASSWORD` | Optional; creates the first admin once |
| `redlink.cors.allowed-origins` | `REDLINK_CORS_ALLOWED_ORIGINS` when deployed | e.g. the Vercel URL |

During development, Vite proxies every `/api/*` request from port 5173 to the backend on port 8080, so no CORS configuration is needed.

---

## Frontend

The React app follows the design system in [`design.md`](design.md). It is a web dashboard only; there is no mobile app, but every page works at tablet and phone widths.

### How it fits together

```
main.tsx
  └─ QueryClientProvider        caches API data, retries server errors once, never 4xx
       └─ AuthProvider          who is signed in: user, role, login(), logout()
            └─ App (routes)     role guards → AppShell (sidebar + top bar) → page
       └─ Toaster               short confirmations after actions

api/client.ts (Axios)
  ├─ adds  Authorization: Bearer <token>
  └─ turns every failure into an ApiError; a 401 on a signed-in request signs the user out
```

### Design tokens

All colours, fonts, the type scale, radii and shadows from `design.md` are Tailwind v4 theme variables in [`src/index.css`](frontend/src/index.css), so they become classes:

| Token | Classes |
|---|---|
| `--color-primary`, `--color-ink`, `--color-text-muted`, … | `bg-primary`, `text-ink`, `text-text-muted`, `border-border` |
| `--font-display`, `--font-mono` | `font-display`, `font-mono` |
| `--text-display-lg`, `--text-title-md`, `--text-caption`, … | `text-display-lg` (size, line height and weight together) |
| `--radius-2xl`, `--shadow-urgent`, `--shadow-focus` | `rounded-2xl`, `shadow-urgent`, `shadow-focus` |

Tailwind's default palette is switched off, so off-brand colours such as `text-gray-500` don't exist. Every variable is also available in plain CSS as `var(--color-ink)`.

### UI components

Import from [`src/components/ui`](frontend/src/components/ui/): `import { Button, Panel } from '../components/ui'`.

| Component | Use |
|---|---|
| `Button`, `LinkButton` | `primary` (one per view), `dark`, `outline`, `text`, `icon` (requires `aria-label`); sizes `sm`, `md`, `lg`; `loading` |
| `Input` | Label, hint, error message wired to `aria-describedby`; works with React Hook Form |
| `Badge`, `Chip`, `UrgencyTag`, `BloodGroupBadge` | Status pills, filter chips, urgency (only Critical is red), blood group tiles shown with a true minus sign (`A−`) |
| `Panel`, `Table` | The container for all data; a typed table with 56px rows |
| `Switch`, `StepProgress` | Availability toggle; multi-stage status such as hospital approval |
| `StateView`, `Skeleton` | The six screen states below |

Every data view shows one of six states, all from `StateView`:

| State | When |
|---|---|
| `loading` | The query is pending; skeleton rows mirror the real layout |
| `empty` | Nothing exists yet; explain the value and offer one primary action |
| `no-results` | Filters matched nothing; keep the chips visible and suggest alternatives |
| `error` | The request failed; shows the `ApiError` message, **Try again** and `Error 504 · ref 7f3a-19c2` |
| `success` | An action finished; say what happened in numbers and link to the next step |
| `blocked` | Not allowed yet, e.g. a hospital awaiting approval; say why, who and how long |

### Routes and roles

| Path | Who |
|---|---|
| `/login`, `/register/donor`, `/register/hospital`, `/forgot-password` | Public (signed-in users are sent home) |
| `/hospital`, `/hospital/requests`, `/hospital/requests/new`, `/hospital/requests/:id` | Hospital staff (approved hospital; others see its approval progress) |
| `/donor`, `/donor/requests`, `/donor/history`, `/donor/profile` | Donors |
| `/admin/hospitals`, `/admin/users`, `/admin/requests`, `/admin/donors` | Admins |
| `/change-password` | Any signed-in user |

`/` sends each user to their home. `RequireAuth` sends signed-out users to `/login?from=…`, users with a temporary password to `/change-password`, and users on another role's page back to their own home. After signing in, users return to the `from` page (only paths on this site are accepted). `HospitalApprovalGate` shows staff of a pending or rejected hospital the approval progress, with the admin's reason if rejected, and re-checks the status when they open a hospital page or press **Check again**. This is for convenience only: the backend's 401 and 403 are the real protection. Pages not built yet show a "coming soon" placeholder.

### Development tools

With `npm run dev`, **http://localhost:5173/dev/components** shows every component and screen state. It is left out of production builds. To try the app as each role (admin, approved / pending / rejected hospital staff, donors), turn on the [sample data](#sample-data) and sign in with those accounts.

### Adding a page

1. **API function** in `src/api/` (e.g. `getRequests()`), plus query keys.
2. **Query hook** in `src/hooks/` typed with `ApiError`: `useQuery<BloodRequest[], ApiError>(…)`.
3. **Page** in `src/pages/<role>/` using `Panel` + `Table` and a `StateView` for loading, error and empty. [`DonorsPage`](frontend/src/pages/admin/DonorsPage.tsx) is the reference.
4. **Route** in [`App.tsx`](frontend/src/App.tsx) inside the right role group; add a sidebar link in [`navigation.ts`](frontend/src/components/layout/navigation.ts) if it needs one.
5. **Types** in `src/types/index.ts`, matching the backend DTO exactly.

---

## Database Design

RedLink uses **7 tables**. The diagram shows how they connect; the sections below list the columns of each table.

### Overview

```mermaid
erDiagram
    USERS ||--o| DONORS : "has a donor profile"
    HOSPITALS ||--o{ USERS : "has staff"
    HOSPITALS ||--o{ BLOOD_REQUESTS : "posts"
    BLOOD_REQUESTS ||--o{ DONOR_RESPONSES : "gets"
    DONORS ||--o{ DONOR_RESPONSES : "sends"
    DONORS ||--o{ DONATIONS : "makes"
    USERS ||--o{ NOTIFICATIONS : "receives"
```

**Reading the relationships in plain English:**

- A **user** can have **one** donor profile (only if their role is `DONOR`).
- A **hospital** has **many** staff users and posts **many** blood requests.
- A **blood request** gets **many** donor responses, but each donor can respond **once**.
- A **donor** builds up a history of **many** donations.
- A **user** receives **many** notifications.

### Table summary

| Table | What it stores | Example row |
|---|---|---|
| 👤 `users` | Everyone who can log in | *kamal@mail.com, role DONOR* |
| 🏥 `hospitals` | Registered hospitals | *City Hospital, Colombo, APPROVED* |
| 🩸 `donors` | Donor profile details | *O+, Colombo, available* |
| 📋 `blood_requests` | A hospital asking for blood | *2 units of A+, CRITICAL, OPEN* |
| ✅ `donor_responses` | A donor's answer to a request | *Kamal → request #5: ACCEPTED* |
| 💉 `donations` | Completed donations (history) | *Kamal, City Hospital, 2026-05-01* |
| 🔔 `notifications` | Messages sent to users | *"A+ needed urgently at City Hospital"* |

### Columns

**Key:** 🔑 primary key · 🔗 links to another table · ⭐ must be unique

#### 👤 users

| Column | Type | Key | Description |
|---|---|:---:|---|
| `id` | bigint | 🔑 | Auto-generated ID |
| `email` | varchar | ⭐ | Login email |
| `password_hash` | varchar | | Encrypted password (never stored as plain text) |
| `full_name` | varchar | | Person's name |
| `phone` | varchar | | Contact number |
| `role` | varchar | | `ADMIN`, `HOSPITAL_STAFF` or `DONOR` |
| `hospital_id` | bigint | 🔗 hospitals | Only set for hospital staff |
| `enabled` | boolean | | `false` blocks login |
| `must_change_password` | boolean | | `true` after an admin sets a temporary password; the user must choose a new one at next login |
| `created_at` | timestamp | | When the account was created |

#### 🏥 hospitals

| Column | Type | Key | Description |
|---|---|:---:|---|
| `id` | bigint | 🔑 | Auto-generated ID |
| `name` | varchar | | Hospital name |
| `registration_no` | varchar | ⭐ | Official registration number |
| `address` | varchar | | Street address |
| `city` | varchar | | Used for matching nearby donors |
| `phone` | varchar | | Contact number |
| `status` | varchar | | `PENDING` → `APPROVED` or `REJECTED` |
| `approved_by` | bigint | 🔗 users | The admin who approved or rejected it |
| `approved_at` | timestamp | | When it was approved or rejected |
| `rejection_reason` | varchar | | Why the admin rejected it (only set when `REJECTED`) |
| `created_at` | timestamp | | When it registered |

#### 🩸 donors

| Column | Type | Key | Description |
|---|---|:---:|---|
| `id` | bigint | 🔑 | Auto-generated ID |
| `user_id` | bigint | 🔗 users ⭐ | The donor's login (one profile per user) |
| `blood_group` | varchar | | `A+` `A-` `B+` `B-` `AB+` `AB-` `O+` `O-` |
| `date_of_birth` | date | | To check the donor's age |
| `city` | varchar | | Where the donor lives |
| `available` | boolean | | Donor can switch this off |
| `last_donation_date` | date | | Used for the 90-day rule |

#### 📋 blood_requests

| Column | Type | Key | Description |
|---|---|:---:|---|
| `id` | bigint | 🔑 | Auto-generated ID |
| `hospital_id` | bigint | 🔗 hospitals | Hospital that needs blood |
| `created_by` | bigint | 🔗 users | Staff member who posted it |
| `blood_group` | varchar | | Blood group needed |
| `units_needed` | int | | Must be more than 0 |
| `urgency` | varchar | | `LOW`, `MEDIUM`, `HIGH` or `CRITICAL` |
| `city` | varchar | | Where the blood is needed |
| `status` | varchar | | `OPEN`, `FULFILLED`, `CANCELLED` or `EXPIRED` |
| `needed_by` | timestamp | | Deadline; after this the request expires |
| `created_at` | timestamp | | When it was posted |
| `closed_at` | timestamp | | When it stopped being `OPEN` |

#### ✅ donor_responses

| Column | Type | Key | Description |
|---|---|:---:|---|
| `id` | bigint | 🔑 | Auto-generated ID |
| `request_id` | bigint | 🔗 blood_requests | Which request |
| `donor_id` | bigint | 🔗 donors | Which donor |
| `status` | varchar | | `ACCEPTED`, `DECLINED` or `WITHDRAWN` |
| `responded_at` | timestamp | | When the donor first answered |
| `updated_at` | timestamp | | When the status last changed (e.g. withdrawn) |

⭐ `request_id` + `donor_id` together are unique, so a donor can't answer the same request twice. Withdrawing updates the existing row instead of adding a new one.

#### 💉 donations

| Column | Type | Key | Description |
|---|---|:---:|---|
| `id` | bigint | 🔑 | Auto-generated ID |
| `donor_id` | bigint | 🔗 donors | Who donated |
| `hospital_id` | bigint | 🔗 hospitals | Where they donated |
| `request_id` | bigint | 🔗 blood_requests | The request it fulfilled (optional) |
| `donation_date` | date | | Also updates the donor's `last_donation_date` |
| `units` | int | | Units donated |

#### 🔔 notifications

| Column | Type | Key | Description |
|---|---|:---:|---|
| `id` | bigint | 🔑 | Auto-generated ID |
| `user_id` | bigint | 🔗 users | Who receives it |
| `request_id` | bigint | 🔗 blood_requests | Related request (optional) |
| `message` | varchar | | Text shown to the user |
| `is_read` | boolean | | `true` once opened |
| `created_at` | timestamp | | When it was sent |

### How the business rules are enforced

| Business rule | How the system makes sure |
|---|---|
| One account per email | `email` is unique in `users` |
| One donor profile per user | `user_id` is unique in `donors` |
| A donor answers a request only once | `request_id` + `donor_id` are unique together in `donor_responses` |
| Only `ACCEPTED` → `WITHDRAWN`, and only while the request is `OPEN` | The service checks the current response and request status before updating |
| Only approved hospitals can post requests | The service checks `hospitals.status = APPROVED` before saving |
| Hospital and its first staff user are created together | Both inserts run in one transaction; if either fails, neither is saved |
| Nobody can register as an admin | Registration endpoints ignore any `role` in the body; the only automatic admin comes from the startup seeder |
| Donor must wait 90 days between donations | The matching query skips donors whose `last_donation_date` is less than 90 days ago |
| Only valid values (blood group, role, status) | Java enums + database `CHECK` constraints |
| Requests need at least 1 unit | `CHECK (units_needed > 0)` |

### Good to know

- **Naming:** Java uses camelCase (`bloodGroup`); the database uses snake_case (`blood_group`). Hibernate converts between them automatically.
- **Speed:** indexes on `donors (blood_group, available, city)` and `blood_requests (status, city)` keep the matching query fast.
- **Blood groups:** the Java enum uses `A_POS`, `A_NEG`, … because Java names can't contain `+` or `-`. The database and the API always use the label (`A+`, `A-`, …); `BloodGroupConverter` translates between them.

### Migrations (Flyway)

All 7 tables are created by **Flyway** from SQL files in `backend/src/main/resources/db/migration/`, not by Hibernate.

- On startup, Flyway runs any migration that hasn't run yet and records it in the `flyway_schema_history` table.
- Hibernate runs with `ddl-auto=validate`: it never changes tables, it only checks that the Java entities match them. If they don't, the app refuses to start and names the mismatch.
- **Never edit a migration that has already run.** To change the schema, add a new file with the next version number, e.g. `V2__add_donor_notes.sql`.

| Migration | What it does |
|---|---|
| `V1__initial_schema.sql` | Creates all 7 tables with their keys, `CHECK` constraints and indexes |

---

## Project Structure

```
RedLink/
├── .github/workflows/ci.yml         # CI pipeline (GitHub Actions)
├── postman/                         # Postman collection + local environment (see Testing the API)
│
├── frontend/                        # React + TypeScript (Vite)
│   ├── src/
│   │   ├── api/                     # Axios client (token + ApiError) and API functions
│   │   ├── auth/                    # AuthProvider, useAuth, route guards
│   │   ├── components/
│   │   │   ├── ui/                  # Design-system components (Button, Panel, StateView, …)
│   │   │   └── layout/              # AppShell, sidebar navigation, user menu
│   │   ├── dev/                     # Component gallery + test sign-in (development only)
│   │   ├── hooks/                   # TanStack Query hooks (useDonors, …)
│   │   ├── lib/                     # Query client, token store, ApiError, formatting, roles
│   │   ├── pages/                   # Route pages, grouped by role (admin/, hospital/, …)
│   │   ├── types/index.ts           # TypeScript types matching backend DTOs and enums
│   │   ├── index.css                # Design tokens (Tailwind @theme) and base styles
│   │   ├── App.tsx                  # Routes
│   │   └── main.tsx                 # Entry point and providers
│   └── vite.config.ts               # Dev server + /api proxy to :8080
│
└── backend/                         # Spring Boot REST API
    ├── src/main/java/com/redlink/backend/
    │   ├── controller/              # REST endpoints (/api/...)
    │   ├── service/                 # Business logic & matching engine
    │   ├── repository/              # Spring Data JPA repositories
    │   ├── model/                   # JPA entities (database tables)
    │   │   ├── enums/               # Role, BloodGroup, statuses, urgency
    │   │   └── converter/           # BloodGroup ⇄ "A+" database converter
    │   ├── dto/                     # Request/response records, ApiError
    │   │   ├── auth/                # Register, login, current user, change password
    │   │   ├── hospital/            # Admin hospital review
    │   │   └── user/                # Admin user management
    │   ├── exception/               # ApiException types + GlobalExceptionHandler
    │   ├── security/                # SecurityConfig (role rules), JwtService, CurrentUser
    │   ├── config/                  # redlink.* settings, admin seeder, sample data seeder, clock
    │   ├── util/                    # Small helpers (email and city normalizing)
    │   └── BackendApplication.java  # Entry point
    ├── src/main/resources/
    │   ├── db/migration/                  # Flyway SQL migrations (V1__…, V2__…)
    │   ├── application.properties         # Shared config (committed)
    │   └── application-local.properties   # DB password, JWT secret, admin (git-ignored)
    ├── src/test/java/com/redlink/backend/
    │   └── support/                       # @IntegrationTest, TestData, TestAuth (test helpers)
    ├── src/test/resources/config/
    │   └── application.properties         # redLink_test database, test-only JWT secret, admin seeder off
    └── pom.xml
```

---

## Getting Started

### Prerequisites

| Tool | Version | Check with |
|---|---|---|
| [Node.js](https://nodejs.org/) | 20 or later | `node -v` |
| [JDK](https://www.oracle.com/java/technologies/downloads/) | 25 or later | `java -version` |
| [PostgreSQL](https://www.postgresql.org/download/) | 18 (includes pgAdmin) | pgAdmin opens and connects |
| [Git](https://git-scm.com/) | any | `git --version` |

Maven does **not** need to be installed. The backend includes the Maven wrapper (`mvnw`).

### 1. Clone the repository

```bash
git clone https://github.com/kbpkavisika/RedLink.git
cd RedLink
```

### 2. Create the database

Make sure the PostgreSQL service is running. Then, in **pgAdmin**, right-click the `postgres` database, choose **Query Tool**, and run:

```sql
CREATE DATABASE "redLink";
CREATE DATABASE "redLink_test";
```

`redLink` is for the app; `redLink_test` is only used by the automated tests, so they never touch your data. The names are **case-sensitive**. Keep the double quotes, or PostgreSQL will create `redlink` instead and the backend won't find it.

### 3. Configure the backend

Secrets are kept out of git. Create the file `backend/src/main/resources/application-local.properties` (it's git-ignored) with:

```properties
spring.datasource.password=YOUR_POSTGRES_PASSWORD

# Signs sign-in tokens. Required: the backend won't start without it. At least 32 characters.
redlink.jwt.secret=PASTE_A_GENERATED_SECRET_HERE

# Optional: creates the first admin account on the next start (you'll change the password at first sign-in)
redlink.admin.email=admin@redlink.lk
redlink.admin.password=CHOOSE_8_TO_72_CHARACTERS

# Optional, this machine only: sample hospitals and donors for testing by hand (see "Sample data" below)
redlink.seed.enabled=true
redlink.seed.password=CHOOSE_8_TO_72_CHARACTERS
```

Generate a secret with either of these:

```bash
openssl rand -base64 48                                     # Git Bash / macOS / Linux
```
```powershell
$b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

The rest of the settings are in `application.properties`:

| Setting | Default |
|---|---|
| Database URL | `jdbc:postgresql://localhost:5432/redLink` |
| Username | `postgres` |
| API port | `8080` |

### 4. Start the backend

```bash
cd backend
./mvnw spring-boot:run        # macOS / Linux / Git Bash
.\mvnw.cmd spring-boot:run    # Windows (PowerShell / Command Prompt)
```

The first run downloads dependencies and takes a few minutes. The backend is ready when you see:

```
Tomcat started on port 8080 (http)
Started BackendApplication in X seconds
```

On the first run, Flyway creates all the tables. Look for `Successfully applied 1 migration to schema "public"`. If you set the admin settings, you'll also see `Created the first admin account: admin@redlink.lk`. **Leave this terminal open.**

#### Sample data

With `redlink.seed.enabled=true`, each start makes sure these accounts exist (anything already there is skipped, so there are no duplicates). They all sign in with your `redlink.seed.password` and don't have to change it.

| Account | Email | Notes |
|---|---|---|
| Admin | `admin@seed.redlink.lk` | |
| Staff, approved hospital | `staff.approved@seed.redlink.lk` | National Hospital Colombo (`SEED-0001`) |
| Staff, pending hospital | `staff.pending@seed.redlink.lk` | Teaching Hospital Kandy (`SEED-0002`) |
| Staff, rejected hospital | `staff.rejected@seed.redlink.lk` | Northern Care Hospital (`SEED-0003`), with a reason |
| 20 donors | `firstname.lastname@seed.redlink.lk`, e.g. `kamal.perera@seed.redlink.lk` | All 8 blood groups; Colombo, Kandy, Galle, Jaffna, Kurunegala |

The donors are chosen to exercise matching. Donation dates are counted back from the day you start the app, so they stay the same relative to today:

- **Never donated:** Kamal Perera, Ishara Gunasekara, Priyanka Herath, Anushka Peiris and others
- **Donated recently (not eligible):** Ruwan Silva (30 days), Chamari Rathnayake (60), Hasini Senanayake (10)
- **The edge of the 90-day rule:** Kasun Dissanayake (89 days, not yet eligible), Sivakumar Rajan (90 days, eligible)
- **Unavailable:** Sajith Bandara, Fathima Nazeer

The full list is in [`DevDataSeeder`](backend/src/main/java/com/redlink/backend/config/DevDataSeeder.java). Never enable the seeder on a deployed server. To start again from scratch, recreate the `redLink` database (see Troubleshooting).

### 5. Start the frontend

In a **second terminal**:

```bash
cd frontend
npm install     # first time only
npm run dev
```

Open **http://localhost:5173**. Requests to `/api/*` are forwarded to the backend on port 8080.

Sign in at **http://localhost:5173/login**, or register as a donor or a hospital. With the [sample data](#sample-data) turned on, you can sign in as any role straight away.

### Troubleshooting

| Error | Cause and fix |
|---|---|
| `database "redLink" does not exist` | Create it (step 2) and check the exact spelling and case |
| `database "redLink_test" does not exist` (in `./mvnw test`) | Create the test database (step 2) |
| `password authentication failed` | Wrong password in `application-local.properties` |
| `Connection to localhost:5432 refused` | PostgreSQL isn't running; start it in `services.msc` (Windows) |
| `Port 8080 was already in use` | Another app is using the port; stop it or change `server.port` and the proxy target in `vite.config.ts` |
| Frontend shows no data / 404 on `/api/...` | The backend isn't running, or the endpoint path doesn't start with `/api` |
| `BUILD SUCCESS` but the app stopped | Maven finished, but the app failed. Scroll up to the first `ERROR` / `Caused by:` line |
| `Found non-empty schema(s) "public" but no schema history table` | Your database has tables from before Flyway was added. Recreate it: in the Query Tool on the `postgres` database run `DROP DATABASE "redLink";` then `CREATE DATABASE "redLink";` (this deletes its data) |
| `Schema-validation: missing column` / `wrong column type` | A Java entity doesn't match the migrations. Fix the entity, or add a new migration; don't edit one that has already run |
| `Property: redlink.jwt.secret` … `is missing` | Add `redlink.jwt.secret` to `application-local.properties` (step 3) |
| `redlink.admin.password must be 8 to 72 characters` | Fix or remove the admin settings in `application-local.properties` |
| `No admin account exists yet` (warning) | Not an error. Add the admin settings (step 3) and restart if you want an admin |
| Every API call returns `401` | You're not sending a token, or it expired. Sign in again (see [Testing the API](#testing-the-api)) |

---

## Testing the API

Start the backend first (step 4). All endpoints are under `http://localhost:8080/api`.

### Available endpoints

| Method | Endpoint | Who | Description |
|---|---|---|---|
| `POST` | `/api/auth/register/donor` | Anyone | Create a donor account (user + donor profile); returns `201` with a token |
| `POST` | `/api/auth/register/hospital` | Anyone | Register a hospital (`PENDING`) and its first staff user; returns `201` with a token |
| `POST` | `/api/auth/login` | Anyone | Email + password (+ optional `rememberMe`) → token |
| `GET` | `/api/auth/me` | Signed in | The current user. For staff, also `hospitalName`, `hospitalStatus` and, if rejected, `hospitalRejectionReason` |
| `PATCH` | `/api/auth/me/password` | Signed in | Change own password (`currentPassword`, `newPassword`) |
| `GET` | `/api/donors` | Admin | List all donors |
| `GET` | `/api/donors/{id}` | Admin | One donor; `404` in the [error format](#error-format) if the ID doesn't exist |
| `GET` | `/api/admin/hospitals?status=` | Admin | All hospitals, newest first; with `status` (`PENDING`, `APPROVED`, `REJECTED`) only that queue, oldest first |
| `GET` | `/api/admin/hospitals/{id}` | Admin | Address, phone, staff contacts, and who decided and when (`reviewedBy`, `reviewedAt`) |
| `PATCH` | `/api/admin/hospitals/{id}/status` | Admin | `{"status":"APPROVED"}` or `{"status":"REJECTED","reason":"…"}` (reason required, max 500). Only `PENDING` hospitals: a decision is final (`409`) |
| `GET` | `/api/admin/users?role=&q=` | Admin | Users newest first (max 200); optional role, and `q` matching part of the name or email |
| `POST` | `/api/admin/users` | Admin | Add `HOSPITAL_STAFF` to an approved hospital with a temporary password; `201` |
| `PATCH` | `/api/admin/users/{id}/password` | Admin | Set a temporary password (not your own); the user must change it at next sign-in |
| `POST` | `/api/requests` | Hospital (approved) | Post a request: `bloodGroup`, `unitsNeeded` (1–20), `urgency`, `city`, `neededBy` (future ISO time). Notifies the top matches; `201` with the request (`reference` "RQ-12"), `matchCount` and `notifiedCount`. `403` while the hospital isn't approved |
| `GET` | `/api/requests/{id}` | Hospital | The request and how many donors were notified. Another hospital's request is `404` |
| `GET` | `/api/requests/{id}/matches?bloodGroup=&city=` | Hospital | Ranked matches with phone, days since last donation, `exactMatch` and `sameCity`. Optional filters keep the order; encode `+` as `%2B` (`O%2B`) |

Everything except register and login needs the header `Authorization: Bearer <token>`.

### Option 1: Terminal

**Git Bash / macOS / Linux (curl):**

```bash
# 1. Register a donor. You're signed in straight away: the response contains a token.
curl -s -X POST http://localhost:8080/api/auth/register/donor \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Kamal Perera","email":"kamal@mail.lk","phone":"0771234567","password":"Passw0rd!",
       "bloodGroup":"O+","dateOfBirth":"1995-04-12","city":"Colombo"}'

# 2. Sign in and keep the token in a variable
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"kamal@mail.lk","password":"Passw0rd!"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')

# 3. Use it
curl -s http://localhost:8080/api/auth/me -H "Authorization: Bearer $TOKEN"
curl -i http://localhost:8080/api/donors -H "Authorization: Bearer $TOKEN"   # 403: donors can't list donors
curl -i http://localhost:8080/api/donors                                     # 401: no token

# 4. As the admin from step 3 of Getting Started
ADMIN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@redlink.lk","password":"YOUR_ADMIN_PASSWORD"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s http://localhost:8080/api/donors -H "Authorization: Bearer $ADMIN"
```

**Windows PowerShell:**

```powershell
# 1. Register a donor
$donor = @{ fullName = 'Kamal Perera'; email = 'kamal@mail.lk'; phone = '0771234567'; password = 'Passw0rd!'
            bloodGroup = 'O+'; dateOfBirth = '1995-04-12'; city = 'Colombo' } | ConvertTo-Json
Invoke-RestMethod -Method Post http://localhost:8080/api/auth/register/donor -ContentType 'application/json' -Body $donor

# 2. Sign in and keep the token
$login = Invoke-RestMethod -Method Post http://localhost:8080/api/auth/login -ContentType 'application/json' `
  -Body (@{ email = 'kamal@mail.lk'; password = 'Passw0rd!' } | ConvertTo-Json)
$auth = @{ Authorization = "Bearer $($login.token)" }

# 3. Use it
Invoke-RestMethod http://localhost:8080/api/auth/me -Headers $auth
```

`Invoke-RestMethod` throws on 4xx/5xx responses, and Windows PowerShell 5.1 hides the body of a `401`. Use `curl.exe -i` to see error bodies. (In PowerShell 5.1, `curl` is an alias for `Invoke-WebRequest`; `curl.exe` is real curl.)

**Expected registration / login response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9…",
  "expiresAt": "2026-10-01T06:00:00Z",
  "user": {
    "id": 1,
    "fullName": "Kamal Perera",
    "email": "kamal@mail.lk",
    "role": "DONOR",
    "mustChangePassword": false
  }
}
```

For hospital staff, `user` also has `hospitalId` and `hospitalStatus` (`PENDING` until an admin approves the hospital).

### Option 2: Postman

The repo includes a ready-made collection in [`postman/`](postman/):

1. In Postman, choose **Import** and select both files in `postman/`: `RedLink.postman_collection.json` and `RedLink-Local.postman_environment.json`.
2. Select the **RedLink Local** environment (top right) and set `seedPassword` to your `redlink.seed.password` (see [Sample data](#sample-data)).
3. Run a request in **1. Sign in** (admin, approved staff, pending staff or donor). Its script saves the token, and every other request sends it automatically.
4. Run anything in the other folders. To act as someone else, run another sign-in request.
   - **4. Admin: hospitals:** run **Pending queue** first; it saves the oldest pending hospital for the details, approve and reject requests.
   - **5. Admin: users:** run **All hospitals** (in 4) first, so **Add staff user** has an approved hospital.
   - **6. Blood requests:** sign in as approved staff and run **Post a request** first; it saves the request for the view and match requests.

The registration requests use `{{$timestamp}}`, so each run creates a new account and signs in as it. To use the deployed API later, duplicate the environment and change `baseUrl`. When you add an endpoint, add it to the collection too (export it from Postman over the file in `postman/`).

### Option 3: Through the frontend

With both servers running, **http://localhost:5173/api/...** reaches the backend through the Vite proxy.

Sign in at `/login` first. The browser then sends your token with every `/api` request, so protected pages such as `/admin/donors` load real data.

### Check the data in the database

In pgAdmin: **redLink → Schemas → public → Tables → donors**, then right-click and choose **View/Edit Data → All Rows**. Or open the Query Tool on `redLink` and run:

```sql
SELECT d.id, u.full_name, d.blood_group, d.city, d.available
FROM donors d
JOIN users u ON u.id = d.user_id;
```

If the table doesn't appear, right-click **Tables** and choose **Refresh**.

### Automated tests

```bash
cd backend
./mvnw test
```

| Test | What it checks | Needs PostgreSQL? |
|---|---|:---:|
| `BackendApplicationTests` (`contextLoads`) | The app starts, Flyway migrations run and every entity matches its table | ✅ |
| `AuthFlowIntegrationTest` | Registration, login, `/me`, password change and role rules through the whole app with real tokens | ✅ |
| `RegistrationRollbackTest` | A failure halfway through hospital registration leaves nothing in the database | ✅ |
| `AdminHospitalIntegrationTest` | The approval queue, hospital details, approve and reject (reason required, decision final), and 403 for non-admins | ✅ |
| `AdminUserIntegrationTest` | User search and role filter, adding staff (approved hospitals only, unique email), temporary passwords that must be changed | ✅ |
| `JwtServiceTest` | Token contents and lifetime; expired, forged and wrong-issuer tokens are rejected; BCrypt hashing | ❌ |
| `SecurityRulesTest` | The role rules for `/api/requests`: staff manage requests, donors respond, everyone else gets 403 | ❌ |
| `CurrentUserTest` | Reading the user from the token; deleted accounts → 401, disabled → 403 | ❌ |
| `RegistrationServiceAgeTest` | The 18–60 donor age rule at its exact edges | ❌ |
| `AdminSeederTest` | The first admin is created once, with a hashed password it must change; bad settings refuse to start | ❌ |
| `DevDataSeederTest` | Sample data is off unless enabled, creates every account once (no duplicates on restart), and covers every blood group and the 90-day edges | ✅ |
| `DonorControllerTest` | Donor endpoints, their errors, and 401 / 403 for missing tokens and wrong roles (`@WebMvcTest`) | ❌ |
| `GlobalExceptionHandlerTest` | Every error case produces the error format, and 500s don't leak internals (uses a test-only controller) | ❌ |
| `BloodGroupTest` | Every blood group converts to its label (`A+`) and back; red cell compatibility matches the table in [Matching engine](#matching-engine) | ❌ |
| `DonorEligibilityTest` | The 90-day rule at its exact edges, and that the matching query's cutoff date agrees with it | ❌ |
| `MatchRankingTest` | The ranking order exactly: exact group → same city (ignoring case) → longest since donation → ID | ❌ |
| `MatchingPropertiesTest` | Every cell of the notification table above, never more than the matches, and bad settings stopping the app | ❌ |
| `MatchingIntegrationTest` | The match filters in PostgreSQL: compatible groups, available, enabled, the 90-day edge, already responded | ✅ |
| `PostBloodRequestIntegrationTest` | Posting notifies exactly the top N, the notification text, the 25 cap, pending/rejected hospitals refused, validation | ✅ |
| `ViewBloodRequestIntegrationTest` | Request details, ranked matches, the group and city filters, closed requests, other hospitals' requests are 404 | ✅ |

Tests that need PostgreSQL use the separate `redLink_test` database (create it in [step 2](#2-create-the-database)), with the same user and password as the app. They run inside a transaction that is **rolled back**, use unique `@test.redlink.lk` emails, and keep the admin seeder switched off. Tests use their own JWT secret from `src/test/resources/config/application.properties`.

**Writing a new test.** Pick the lightest kind that covers it:

| Kind | Use for | How |
|---|---|---|
| Plain unit test | Rules and calculations (`DonorEligibilityTest`) | `new` the class; pass a fixed `Clock` or date |
| Controller test | Request/response shape, validation, 401/403 | `@WebMvcTest(XController.class)` + `@Import(SecurityConfig.class)`, `@MockitoBean` the service, `.with(TestAuth.ADMIN)` |
| Integration test | Services and queries against real PostgreSQL | `@IntegrationTest`, then inject `MockMvc` and `TestData` |

```java
@IntegrationTest
class MatchingIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired TestData testData;

    @Test
    void example() throws Exception {
        Donor donor = testData.donor(BloodGroup.O_NEG, "Kandy", null);   // never donated
        User staff = testData.staff(testData.hospital(HospitalStatus.APPROVED));
        mvc.perform(get("/api/...").header("Authorization", testData.bearer(staff)));
    }
}
```

To run only the tests that don't need a database:

```bash
./mvnw test -Dtest="JwtServiceTest,CurrentUserTest,RegistrationServiceAgeTest,AdminSeederTest,DonorControllerTest,GlobalExceptionHandlerTest,BloodGroupTest,DonorEligibilityTest,SecurityRulesTest,MatchRankingTest,MatchingPropertiesTest"
```

### Planned endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/requests/{id}/responses` | Hospital | Donor responses to a request |
| `PATCH` | `/api/requests/{id}/status` | Hospital | Mark fulfilled or cancelled |
| `GET` | `/api/donor/me` | Donor | View own profile |
| `PATCH` | `/api/donor/me/availability` | Donor | Toggle availability |
| `GET` | `/api/donor/requests` | Donor | Incoming matching requests |
| `POST` | `/api/requests/{id}/responses` | Donor | Accept or decline (once) |
| `PATCH` | `/api/requests/{id}/responses/me` | Donor | Withdraw an accepted response while the request is open |
| `GET` | `/api/donor/donations` | Donor | Donation history |

All of these will need the header `Authorization: Bearer <token>`.

---

## Scripts

### Frontend (`frontend/`)

| Command | Description |
|---|---|
| `npm run dev` | Start the development server (http://localhost:5173) |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

### Backend (`backend/`)

On Windows, use `.\mvnw.cmd` instead of `./mvnw`.

| Command | Description |
|---|---|
| `./mvnw spring-boot:run` | Start the API (http://localhost:8080) |
| `./mvnw test` | Run tests |
| `./mvnw clean package` | Build a runnable JAR in `target/` |

---

## Development Workflow

`main` is protected: changes can't be pushed to it directly. Every change goes through a pull request, and both CI checks must pass before it can be merged.

```
feature branch ──► pull request ──► CI runs ──┬── ❌ fails  → fix and push again (CI re-runs)
                                              └── ✅ passes → merge into main
```

### Steps

```bash
git checkout main
git pull
git checkout -b feature/your-change    # new branch for each task

# ...make changes...

git add .
git commit -m "feat: describe your change"
git push -u origin feature/your-change
```

Then open a pull request into `main` on GitHub and merge it once both checks are green.

### Branch names

| Prefix | Use for |
|---|---|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `docs/` | README and documentation |
| `ci/` | Workflow and pipeline changes |

### What CI checks

The workflow in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and every push to `main`:

| Job | Steps |
|---|---|
| **Backend (build + test)** | Starts a temporary PostgreSQL 18 database (`redLink_test`), sets up Java 25, runs `./mvnw verify` (compile + tests) |
| **Frontend (lint + build)** | Sets up Node.js 24, runs `npm ci`, `npm run lint` and `npm run build` |

Run the same checks locally before pushing:

```bash
cd frontend && npm run lint && npm run build
cd ../backend && ./mvnw verify          # Windows: .\mvnw.cmd verify
```

---

## Roadmap

- [x] Project setup: React + TypeScript frontend, Spring Boot backend, PostgreSQL
- [x] Frontend → backend → database connection (`/api/donors`)
- [x] Full database schema (users, hospitals, requests, responses, donations, notifications)
- [x] Flyway database migrations
- [x] Service layer, DTOs, input validation and global error handling
- [x] Frontend foundation: design tokens, UI components, screen states, auth plumbing, role-based routing and app shell
- [x] Authentication and roles with Spring Security + JWT
- [x] Startup seeder for the first admin account
- [x] Sample data for local testing (admin, hospitals, 20 donors), switched on per machine
- [x] Donor registration and hospital registration (hospital + first staff user)
- [x] Change own password (API)
- [x] Frontend sign-in, registration and change-password pages, and the hospital approval screen
- [x] Admin approval of hospitals, with rejection reason
- [x] Admin user management: search users, add staff users, set temporary passwords
- [x] Blood requests and the matching engine (post, ranked matches with filters, request page)
- [x] Configurable notification count (units × urgency multiplier, capped)
- [ ] Donor responses (accept, decline, withdraw) and donation history
- [ ] Notifications
- [ ] Role-based dashboards in the frontend (placeholders in place)
- [ ] Frontend component tests (Vitest + Testing Library)
- [x] GitHub Actions CI (backend tests + frontend lint/build on every pull request)
- [x] Branch protection on `main` (pull request + passing CI required)
- [ ] Dockerize the backend
- [ ] Deployment (Vercel, Render, Neon)

### Later (v2)

- [ ] Password reset by email (one-time link; Mailtrap in development, Brevo or Resend in production)
- [ ] Hospital staff invite their own colleagues instead of asking the admin
- [ ] Notify donors in waves: if too few accept in time, notify the next group
- [ ] When a donor withdraws, automatically notify the next donor in the ranked list
