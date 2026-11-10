# Task Manager

A full-stack task manager for teams: shared projects with owners and members, task assignment, an admin panel, and progress / overdue reports.

- **Live app:** https://rathunuu.github.io/task-manager-final/
- **Live API:** https://task-manager-final-dkv6.onrender.com
- **User guide (non-technical):** [USER_GUIDE.md](USER_GUIDE.md)

## Features

- Sign up / log in (email + password, or Google). Everyone starts as a normal user; an existing admin can promote others.
- **Shared projects:** a project has members, each either an *owner* or a *member*. Owners add and remove members and edit or delete the project. Members work with its tasks.
- **Tasks:** list and board views, priority, status, due date, category, AI task parsing (Gemini).
- **Admin panel:** assign a task to many people at once, change roles, **deactivate / reactivate users**, **archive / unarchive projects**, and see reports.
- **Reports:** progress per project (% completed, count per status) and an overdue-tasks list.
- **Nothing is hard-deleted by the admin panel.** Deactivating a user or archiving a project only flips a flag; tasks, memberships and history stay.

## Tech stack

| Part | Technology | Hosted on |
| --- | --- | --- |
| Frontend (`task-manager-react/`) | React, Vite, Tailwind CSS | GitHub Pages |
| Backend (`server/`) | Node.js, Express 5, Mongoose 8, Zod, JWT, bcrypt | Render |
| Database | MongoDB | MongoDB Atlas |

## Rules worth knowing

- **Who can do what on a project** lives in one file: `server/utils/projectAccess.js`.
  - Not a member: the project looks like it does not exist (404).
  - Member but not owner: 403 on owner-only actions.
  - Global admin: may manage members and archive any project.
- **Deactivated users** cannot log in (403) and any token they already hold stops working on the next request (401). Checked on every request in `authMiddleware`.
- **Last admin:** an admin cannot deactivate or demote their own account, and the system refuses to remove the last active admin.
- **Archived projects** are hidden from the project list (`GET /api/projects`, used by the project switcher) unless `?includeArchived=true` is passed. They still open directly (`GET /api/projects/:id`) and keep all their tasks.
- **Login lockout:** 5 wrong passwords for the same email lock that email for 15 minutes (HTTP 429 with a clear message). A correct login resets the counter. The counter is kept in server memory, so a server restart clears it; that is fine for one Render instance. Several servers would need a shared store.

## API overview

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/google`, `GET /api/auth/users` (admin), `PATCH /api/auth/users/:id/role` (admin), `PATCH /api/auth/users/:id/active` (admin) |
| Projects | `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`, `PATCH /api/projects/:id/archive`, `GET /api/projects/admin/all` (admin), members: `GET/POST /api/projects/:id/members`, `DELETE /api/projects/:id/members/:userId` |
| Tasks | `GET/POST /api/tasks`, `PUT/DELETE /api/tasks/:id`, `POST /api/tasks/admin/assign` (admin), `GET /api/tasks/admin/overview` (admin) |
| Reports | `GET /api/reports/progress`, `GET /api/reports/overdue` (your projects; admins see all) |

## Running locally

```bash
# backend
cd server
npm install
# create server/.env (see "Environment variables"), then:
npm run dev

# frontend (second terminal)
cd task-manager-react
npm install
npm run dev
```

## Tests and CI

```bash
cd server
npm test
```

Tests use Jest, supertest and an in-memory MongoDB, so they never touch a real database. GitHub Actions (`.github/workflows/test.yml`) runs them on every push and on every pull request to `main`.

## Environment variables

Secrets are set **on the hosting dashboard, never committed**. `server/.env` is git-ignored.

**Backend (Render → Environment):**

| Name | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Signs login tokens. Long and random |
| `GOOGLE_CLIENT_ID` | Google sign-in |
| `GEMINI_API_KEY` | AI task parsing |
| `PORT` | Set by Render automatically |

**Frontend** (public by nature, they end up inside the built website): `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`.

**GitHub repository secrets:** `MONGO_URI` (only for the migration workflows), `VITE_GOOGLE_CLIENT_ID` (used by the Pages deploy).

## Deployment

1. Merge to `main`.
2. **Backend:** Render deploys `main` automatically. Check the logs for "MongoDB connected successfully" and "Server running".
3. **Frontend:** the "Deploy React App" workflow builds and publishes to GitHub Pages.

## Database backups (MongoDB Atlas)

- Check the cluster's **Backup** tab in Atlas. Automated Cloud Backup (continuous or scheduled snapshots with restore) is available on paid clusters (M10 and above). The free shared tier does not include it.
- On a free cluster, take a manual copy before any risky change, for example with `mongodump --uri "<MONGO_URI>"`, and keep the output somewhere safe.
- Test a restore at least once. A backup that was never restored is only a hope.
- Deactivate and archive exist so that nobody needs to delete data to "tidy up".

## Database migrations

`server/scripts/migrate-project-owners.js` moved projects from a single `owner` to a `members` list. It is idempotent (safe to run again) and keeps a backup collection. It runs through the *Migration rehearsal* and *Migration live* workflows. Rehearse on a copy first.

## Project layout

```
server/            Express API, models, routes, tests
task-manager-react/  React frontend
.github/workflows/ tests, deploy, migrations
```
