# Sweety - Blood Glucose Tracker

A full-stack blood glucose tracking application for diabetes patients. Users register, log up
to four readings a day, and review daily, month-to-date and previous-month reports built from
their own PostgreSQL records.

Built as the technical assignment for the **Junior Full Stack Developer - JavaScript & AI**
role at **Kenpath Technologies**.

![Dashboard](docs/screenshots/03-dashboard.png)

---

## Table of contents

1. [Introduction](#1-introduction)
2. [Features](#2-features)
3. [Technology stack](#3-technology-stack)
4. [Project architecture](#4-project-architecture)
5. [Database setup](#5-database-setup)
6. [Environment configuration](#6-environment-configuration)
7. [Installation](#7-installation)
8. [Start the backend](#8-start-the-backend)
9. [Start the frontend](#9-start-the-frontend)
10. [Run migrations](#10-run-migrations)
11. [Seed the database](#11-seed-the-database)
12. [Run tests](#12-run-tests)
13. [API documentation](#13-api-documentation)
14. [Demo credentials](#14-demo-credentials)
15. [Screenshots](#15-screenshots)
16. [Assumptions and design decisions](#16-assumptions-and-design-decisions)
17. [Future improvements](#17-future-improvements)

---

## 1. Introduction

Sweety is a small, focused healthcare tool. A patient records a blood glucose measurement up to
four times a day - on waking, after breakfast, after lunch and after dinner - and the app turns
those measurements into readable daily and monthly summaries.

Everything is measured in **mg/dL**. Every calculation is performed by PostgreSQL over the
authenticated user's rows only. Two patients can never see each other's data.

The project is deliberately built with a small, conventional stack (React + Express + PostgreSQL)
rather than anything exotic, so the code is easy to review and easy to run.

---

## 2. Features

### Accounts
- Registration with full name, email, password and password confirmation.
- Passwords hashed with bcrypt - plaintext passwords are never stored or returned.
- JWT authentication; every reading and report endpoint is protected.
- Logout, plus automatic logout when a token expires mid-session.
- Duplicate emails rejected (case-insensitive), with a friendly message.

### Readings (full CRUD)
- Add, view, edit and delete glucose readings.
- Four permitted slots per day: Morning (Fasting), After Breakfast, After Lunch, After Dinner.
- Confirmation dialog before every delete.
- Friendly empty states everywhere a list or report can be empty.
- Date-range filtering and pagination on the history page.

### Validation - all five required rules

| # | Rule | Message |
|---|------|---------|
| 1 | Value is required | `Please enter a glucose value.` |
| 2 | Whole number, 40-600 | `Value must be between 40 and 600 mg/dl.` |
| 3 | One reading per slot per day | `You already have an [slot name] reading for this date.` |
| 4 | Maximum four readings per day | `You can add only 4 readings per day.` |
| 5 | No future dates | `Date cannot be in the future.` |

Each rule is enforced by the API **and** independently by the database.

### Reports
- **Daily** - highest, lowest, average, count, plus every reading with its slot.
- **Month-to-date** - 1st of the selected month through the selected date.
- **Previous month** - first through last day of the previous calendar month.
- Averages rounded to one decimal place, computed in SQL.
- Empty periods return `null` (not `0`) so an empty report can never look like a measurement.
- Handles 28/29/30/31-day months and the December-to-January year transition.

### Bonus items implemented
- Recharts line chart of glucose readings across the month, with 70/180 mg/dL reference lines.
- Pagination on `GET /api/readings` (`page`, `limit`) with a paginated UI.
- React Testing Library tests for the reading form.

---

## 3. Technology stack

**Frontend**
- React 18 + Vite 5
- React Router DOM 6
- Axios
- Tailwind CSS 3.4
- Recharts 2 (trend chart)
- Lucide React (icons)
- Vitest + React Testing Library + jsdom

**Backend**
- Node.js (tested on v24.22.1)
- Express 4
- PostgreSQL 16 via the `pg` driver
- JWT (`jsonwebtoken`)
- bcrypt (`bcryptjs`)
- `express-validator` for request validation
- Vitest + Supertest for API tests

**Why `bcryptjs` rather than `bcrypt`?** `bcryptjs` implements the same bcrypt algorithm in pure
JavaScript. It avoids native compilation and prebuilt-binary mismatches on Windows, which matters
for a project that must run first time on a reviewer's machine. The hash format is identical
(`$2a$...`) and hashes are interchangeable with the native module.

---

## 4. Project architecture

```
Sweety-Glucose-Tracker-app/
├─ client/                          React application (Vite)
│  ├─ src/
│  │  ├─ api/client.js              Axios instance, JWT interceptor, error helpers
│  │  ├─ components/                Layout, Modal, StatCard, ReadingForm, charts, tables
│  │  ├─ context/                   AuthContext, ToastContext
│  │  ├─ pages/                     Login, Register, Dashboard, Readings, Reports, NotFound
│  │  ├─ utils/                     Date and glucose helpers
│  │  └─ tests/                     Setup + ReadingForm tests
│  └─ vite.config.js                Dev proxy (/api -> :5000), Vitest config, chunking
│
├─ server/                          Express REST API
│  ├─ src/
│  │  ├─ config/                    Environment loading and validation
│  │  ├─ db/                        Pool, schema.sql, migrate.js, seed.js
│  │  ├─ middleware/                auth, validate, errorHandler
│  │  ├─ routes/                    auth, readings, reports
│  │  ├─ controllers/               Request/response handling
│  │  ├─ services/                  Business logic and SQL
│  │  ├─ validators/                express-validator rule sets
│  │  └─ utils/                     Errors, dates, slot metadata
│  └─ tests/                        Supertest integration tests
│
├─ scripts/                         start-db.ps1 / stop-db.ps1 (portable PostgreSQL)
├─ docs/screenshots/                Screenshots used in this README
├─ .gitignore
└─ package.json                     Convenience scripts for both halves
```

### Request flow

```
React (Axios + JWT)
  -> POST /api/readings
     -> express-validator        field-level rules, exact required messages
     -> authenticate             verifies JWT, derives req.user.id
     -> reading.service          day-limit + duplicate-slot checks, then SQL
     -> PostgreSQL               unique / CHECK / trigger enforce the same rules again
  <- { success, message, data }
```

### Why the database enforces the rules as well

Application validation gives good error messages; database constraints guarantee the data is
still correct if code is ever added that bypasses a service. Both layers are real:

- `glucose_value INTEGER` - a fractional value can never be stored.
- `CHECK (glucose_value BETWEEN 40 AND 600)`.
- `UNIQUE (user_id, reading_date, time_slot)` - one reading per slot per day.
- A four-value enum plus that unique constraint makes a fifth reading per day impossible.
- A `BEFORE INSERT/UPDATE` trigger raises SQLSTATE `SW001` for future dates, because
  `CHECK` constraints cannot reference `CURRENT_DATE` (it is not immutable).

PostgreSQL errors are mapped to the required user-facing messages in
`server/src/middleware/errorHandler.js`, so even a concurrent duplicate insert returns the
right text rather than a raw driver error.

---

## 5. Database setup

### Option A - standard PostgreSQL (recommended for reviewers)

If PostgreSQL is installed as a service, create the databases and skip ahead:

```bash
createdb -U postgres sweety_db
createdb -U postgres sweety_test
```

Then set `DATABASE_URL` and `TEST_DATABASE_URL` in `server/.env`. No other changes are needed.

### Option B - portable PostgreSQL, no administrator rights

This is how the project was developed on a Windows machine without admin access: the official
EnterpriseDB binaries run from a user folder, with no Windows service and no installer.

```powershell
# 1. Download and extract the official binaries (~300 MB)
curl.exe -L -o "$env:TEMP\pg16.zip" https://get.enterprisedb.com/postgresql/postgresql-16.9-1-windows-x64-binaries.zip
tar.exe -xf "$env:TEMP\pg16.zip" -C "C:\Users\$env:USERNAME"      # creates C:\Users\<you>\pgsql

# 2. Create a cluster on a non-default port
$bin  = "C:\Users\$env:USERNAME\pgsql\bin"
$data = "C:\Users\$env:USERNAME\pgsql-data"
"postgres" | Out-File -Encoding ascii -NoNewline "$env:TEMP\pgpw.txt"
& "$bin\initdb.exe" -D $data -U postgres --pwfile="$env:TEMP\pgpw.txt" --auth-host=scram-sha-256 --auth-local=trust -E UTF8
Add-Content "$data\postgresql.conf" "`nport = 55432`nlisten_addresses = 'localhost'"

# 3. Start it and create both databases
powershell -File scripts\start-db.ps1
$env:PGPASSWORD = "postgres"
& "$bin\createdb.exe" -h 127.0.0.1 -p 55432 -U postgres sweety_db
& "$bin\createdb.exe" -h 127.0.0.1 -p 55432 -U postgres sweety_test
```

Stop it again with `powershell -File scripts\stop-db.ps1`.

### Schema

Created by `npm run migrate` from `server/src/db/schema.sql`:

```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TYPE time_slot AS ENUM ('MORNING','AFTER_BREAKFAST','AFTER_LUNCH','AFTER_DINNER');

CREATE TABLE readings (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reading_date  DATE        NOT NULL,
  time_slot     time_slot   NOT NULL,
  glucose_value INTEGER     NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_readings_glucose_range CHECK (glucose_value BETWEEN 40 AND 600),
  CONSTRAINT uq_readings_user_date_slot UNIQUE (user_id, reading_date, time_slot)
);

CREATE INDEX idx_readings_user_id   ON readings (user_id);
CREATE INDEX idx_readings_user_date ON readings (user_id, reading_date DESC);
```

A case-insensitive unique index on `lower(email)` prevents `A@b.com` and `a@b.com` from
registering as two accounts.

---

## 6. Environment configuration

Copy the example file and adjust if needed:

```bash
cp server/.env.example server/.env
```

`server/.env`

| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | API port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | Main database | `postgresql://postgres:postgres@localhost:55432/sweety_db` |
| `TEST_DATABASE_URL` | Test database (used when `NODE_ENV=test`) | `postgresql://postgres:postgres@localhost:55432/sweety_test` |
| `JWT_SECRET` | Signing secret - **must be replaced** | any long random string |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost:5173` |

`client/.env` (optional)

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_API_URL` | API base URL | `/api` (proxied by Vite to `http://localhost:5000`) |

`.env` files are git-ignored. Only `.env.example` files are committed, and they contain no real
secrets.

Generate a strong secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 7. Installation

Prerequisites: **Node.js 18+** and a running **PostgreSQL 13+**.

```bash
git clone https://github.com/Sairajlole/Sweety-Glucose-Tracker-app.git
cd Sweety-Glucose-Tracker-app

# install both halves
npm run install:all
# (equivalent to: cd server && npm install, then cd client && npm install)

# configure the API
cp server/.env.example server/.env      # then edit JWT_SECRET and DATABASE_URL
```

---

## 8. Start the backend

```bash
cd server
npm run migrate     # create the tables (safe to re-run)
npm run seed        # optional: demo account and sample readings
npm run dev         # http://localhost:5000, restarts on change
```

`npm start` runs it without file watching. The server refuses to start if `DATABASE_URL` or
`JWT_SECRET` is missing, and logs a clear message if it cannot reach PostgreSQL.

Health check: `GET http://localhost:5000/api/health`

---

## 9. Start the frontend

In a second terminal:

```bash
cd client
npm run dev         # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:5000`, so the browser never makes a cross-origin
request in development.

Production build:

```bash
cd client
npm run build       # outputs to client/dist
npm run preview
```

---

## 10. Run migrations

```bash
cd server
npm run migrate
```

The migration applies `src/db/schema.sql` inside a transaction. It is written to be idempotent
(`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE`, and a guarded `CREATE TYPE`), so running it
repeatedly never drops data.

---

## 11. Seed the database

```bash
cd server
npm run seed
```

Creates the demo account and 80 readings across the last 24 days, with realistic per-slot ranges
(morning fasting lowest, post-meal higher) and a few deliberately missed days.

The script is safe to run repeatedly: the user is upserted on email and readings are inserted
with `ON CONFLICT (user_id, reading_date, time_slot) DO NOTHING`. Verified in this build - three
consecutive runs produced 80 readings each time, with 1 user and 0 duplicates.

---

## 12. Run tests

```bash
# everything
npm test

# backend only - 68 tests
cd server && npm test

# frontend only - 18 tests
cd client && npm test
```

Backend tests are **integration** tests: they run Supertest against the real Express app and a
real PostgreSQL database (`TEST_DATABASE_URL`), truncating tables between tests. No database
mocking, so the constraints and SQL aggregates are genuinely exercised.

Coverage:

| Area | Tests |
|------|-------|
| Authentication - register, duplicate/case-insensitive email, login, wrong password, unknown email, `/me`, missing/forged tokens, protected routes | 18 |
| Readings - creation, boundaries 40/600, all five validation rules, decimal and non-numeric input, invalid slot/date, listing, pagination, date filters, get/update/delete, cross-user 404s, ignored client `user_id` | 36 |
| Reports - daily, month-to-date, previous month, empty periods, leap-February, year transition, cross-user isolation, parameter validation | 14 |
| Reading form (React Testing Library) - rendering, all four slots, validation messages, submission payload, server error display, cancel | 18 |

Last verified run: **18 + 36 + 14 = 68 backend, 18 frontend, 86 total passing**.

### Browser verification

The UI was driven end to end with Playwright/Chromium against the real API: login, dashboard,
add/validation/delete dialogs, history, all three report tabs and a 390 px mobile viewport.
Result: **0 console errors, 0 page errors, 0 failed network requests**.

---

## 13. API documentation

Base URL: `http://localhost:5000/api`

All responses use one envelope:

```json
{ "success": true,  "message": "Reading created successfully", "data": {} }
{ "success": false, "message": "Validation error", "errors": [{ "field": "glucoseValue", "message": "..." }] }
```

Requests and responses use **camelCase** field names throughout.

### Conventions

- `Authorization: Bearer <token>` is required on every readings and reports endpoint.
- `user_id` is **never** accepted from the client; it always comes from the verified token.
- Another user's reading returns **404**, not 403, so IDs cannot be probed.
- Status codes: `200` OK, `201` Created, `400` validation, `401` unauthenticated, `404` not found,
  `409` conflict (duplicate slot / duplicate email / daily limit), `500` unexpected.

### Authentication

#### `POST /api/auth/register`

```json
{ "name": "Sweety Sharma", "email": "sweety@example.com", "password": "SweetyPass123" }
```

`201` on success; `409` `An account with this email already exists.`; `400` on validation failure.
The response contains a JWT and the user (never the password hash).

#### `POST /api/auth/login`

```json
{ "email": "demo@sweety.app", "password": "SweetyDemo@123" }
```

`200` with `{ token, user }`; `401` `Invalid email or password.` for both wrong password and
unknown account.

#### `GET /api/auth/me`

Returns the authenticated user. `401` without a valid token.

### Readings

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/readings` | Create. `201`. |
| `GET` | `/api/readings` | List. Supports `page`, `limit` (max 200), `from`, `to`, `timeSlot`. |
| `GET` | `/api/readings/:id` | Single reading. `404` if not owned. |
| `PUT` | `/api/readings/:id` | Update (full body). `404` if not owned. |
| `DELETE` | `/api/readings/:id` | Delete. Returns the deleted id. `404` if not owned. |

Create/update body:

```json
{ "readingDate": "2026-11-14", "timeSlot": "AFTER_LUNCH", "glucoseValue": 126 }
```

Valid `timeSlot` values: `MORNING`, `AFTER_BREAKFAST`, `AFTER_LUNCH`, `AFTER_DINNER`.

List response:

```json
{
  "success": true,
  "message": "Readings retrieved successfully",
  "data": {
    "readings": [
      {
        "id": 42,
        "readingDate": "2026-11-14",
        "timeSlot": "AFTER_LUNCH",
        "timeSlotLabel": "After Lunch",
        "glucoseValue": 126,
        "createdAt": "2026-11-14T09:12:03.221Z",
        "updatedAt": "2026-11-14T09:12:03.221Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 80, "totalPages": 4 }
  }
}
```

### Reports

| Method | Path | Range |
|--------|------|-------|
| `GET` | `/api/reports/daily?date=YYYY-MM-DD` | the selected date |
| `GET` | `/api/reports/month-to-date?date=YYYY-MM-DD` | 1st of that month → selected date |
| `GET` | `/api/reports/monthly?date=YYYY-MM-DD` | first → last day of the **previous** month |

All three share a `summary` shape:

```json
{
  "success": true,
  "message": "Daily report generated successfully",
  "data": {
    "report": {
      "type": "daily",
      "date": "2026-11-15",
      "period": { "from": "2026-11-15", "to": "2026-11-15", "label": "2026-11-15" },
      "summary": { "highest": 149, "lowest": 100, "average": 125.3, "totalReadings": 4 },
      "hasData": true,
      "readings": [
        { "id": 1, "readingDate": "2026-11-15", "timeSlot": "MORNING",
          "timeSlotLabel": "Morning (Fasting)", "glucoseValue": 100 }
      ]
    }
  }
}
```

When a period has no readings, `hasData` is `false` and `highest`, `lowest` and `average` are
`null` rather than `0`. Only the daily report includes the `readings` array.

---

## 14. Demo credentials

```
Email:    demo@sweety.app
Password: SweetyDemo@123
```

The login screen has a **Fill demo credentials** button. These credentials exist only for local
demonstration and must never be used in a production deployment.

---

## 15. Screenshots

| Screen | Preview |
|--------|---------|
| Login | ![Login](docs/screenshots/01-login.png) |
| Register | ![Register](docs/screenshots/02-register.png) |
| Dashboard | ![Dashboard](docs/screenshots/03-dashboard.png) |
| Add reading | ![Add reading](docs/screenshots/04-add-reading.png) |
| Validation errors | ![Validation](docs/screenshots/05-validation-error.png) |
| Reading history | ![History](docs/screenshots/06-reading-history.png) |
| Daily report | ![Daily report](docs/screenshots/07-reports-daily.png) |
| Month to date | ![Month to date](docs/screenshots/08-reports-month-to-date.png) |
| Previous month | ![Previous month](docs/screenshots/09-reports-previous-month.png) |
| Delete confirmation | ![Delete](docs/screenshots/10-delete-confirmation.png) |
| Mobile dashboard | ![Mobile](docs/screenshots/11-dashboard-mobile.png) |
| Empty state | ![Empty](docs/screenshots/12-reports-empty-state.png) |

---

## 16. Assumptions and design decisions

1. **Validation order.** With only four slots, a fifth reading is necessarily also a duplicate
   slot. The API therefore checks *daily count* before *duplicate slot*, otherwise
   `You can add only 4 readings per day.` would be unreachable. With three or fewer readings,
   re-using a slot correctly reports the duplicate instead. On update, the row being edited is
   excluded from both checks, so re-saving without changing the slot never reports a phantom
   duplicate.

2. **Article in the duplicate-slot message.** The required template is
   `You already have an [slot] reading for this date.` Applied literally to the slot names, three
   of four ("an After Breakfast/Lunch/Dinner") read correctly but "an Morning (Fasting)" does not.
   The article is chosen from the label, so all four messages are grammatical.

3. **camelCase API contract.** Requests and responses both use camelCase. An earlier build
   accepted snake_case input while returning camelCase output; the integration tests caught the
   mismatch and the contract was unified.

4. **Decimals.** The API rejects `97.5` with `Value must be between 40 and 600 mg/dl.` The
   `INTEGER` column guarantees nothing fractional is ever *stored*. Note that PostgreSQL itself
   would round `97.5` to `98` if a fractional literal were inserted directly, which is why
   decimal rejection lives in the API layer - this was verified rather than assumed.

5. **Add/Edit form.** Implemented as a reusable modal (`ReadingFormModal`) launched from the
   dashboard and the history page, rather than a dedicated route. This is the common SaaS
   pattern and keeps the list visible behind the form.

6. **Time slots are fixed.** The four slots are a database enum, so adding a fifth would require
   a migration - an intentional trade-off that lets the database guarantee the daily limit.

7. **Dates are calendar days.** `DATE` values are returned to Node as `'YYYY-MM-DD'` strings
   (a custom `pg` type parser) instead of JS `Date` objects, so timezone conversion can never
   shift a reading to the previous or next day.

8. **bcryptjs** is used instead of the native `bcrypt` module for installation reliability; the
   algorithm and hash format are identical.

9. **Tailwind 3.4** rather than Tailwind 4, for a stable, widely documented PostCSS setup.

10. **Docker Compose was not implemented.** It was optional, and Docker was unavailable on the
    development machine, so shipping an unverified container setup would have been dishonest.

**Not implemented (all optional in the brief):** Docker Compose, Redis, BullMQ, doctor/role
features.

---

## 17. Future improvements

- Refresh tokens with rotation, and a server-side token denylist on logout.
- Password reset by email, plus email verification at registration.
- Rate limiting on `/api/auth/*` (e.g. `express-rate-limit`) to slow credential stuffing.
- Timezone-aware "today" derived from the user's profile rather than the server's clock.
- Soft deletes plus an audit trail for clinical traceability.
- CSV/PDF export and a shareable summary for a doctor's appointment.
- Configurable target ranges (the 70/140/180 bands are currently general adult defaults).
- End-to-end tests (Playwright) committed to the repository - the browser checks in this build
  were run ad hoc rather than committed as a suite.
- Docker Compose once Docker is available, for a one-command setup.

---

## Author

**Sairaj Lole**
- GitHub: [@Sairajlole](https://github.com/Sairajlole)
- Email: sairajlole2004@gmail.com

## License

MIT
