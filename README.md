# Task Manager (React)

**🔗 Live App:** https://rathunuu.github.io/task-manager-final/

This is the **one, final, live** Task Manager app — built with React, Tailwind CSS, login/signup, an admin dashboard, and task assignment between users.

## ⚠️ Older versions are retired

Two earlier versions of this project were built while learning:

- `task-manager` (original vanilla JS version)
- `task-manager-v2` / `task-manager-react` (vanilla JS with login/admin added)

**Both are retired.** Their code stays in git history for reference, but nothing new goes into them. All future work happens in this repo only.

## ✨ Features

- **Login & Signup** — the first account created automatically becomes Admin; everyone else signs up as a regular User
- **Admin Dashboard** — Admins can add new users and assign tasks directly to them (with category, priority, status, and due date)
- **Task Manager** — projects, list & Kanban board views, subtasks, notes, drag-and-drop reordering, search/filter/sort, JSON export/import
- **Role-based UI** — the Admin Dashboard link only renders for admins, using React conditional rendering (`{role === "admin" && <button>...}`) instead of a CSS `hidden` attribute, so the link can never be shown by a stray CSS rule

## 🛠️ Tech Stack

- React + Vite
- Tailwind CSS (v4, via `@tailwindcss/vite`)
- Browser `localStorage` / `sessionStorage` for data and session (no backend yet)

## 🚀 Running locally

```bash
npm install
npm run dev
```

## 📦 Deploying

```bash
npm run deploy
```

This builds the app and publishes the `dist` folder to the `gh-pages` branch, which GitHub Pages serves.
