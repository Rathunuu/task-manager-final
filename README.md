# Task Manager

A full-stack Task Manager application built with React, Node.js, Express, MongoDB, and Gemini AI.

## 🔗 Links

**Live Frontend:**
https://rathunuu.github.io/task-manager-final/

**GitHub Repository:**
https://github.com/Rathunuu/task-manager-final

## ✨ Features

### Frontend

* Login and Signup
* Admin dashboard
* Task creation and management
* Project management
* List and Kanban board views
* Search, filter, and sort
* Task assignment
* Subtasks and notes
* Drag-and-drop task ordering
* JSON import/export
* Responsive UI

### Backend

* Node.js and Express REST API
* MongoDB Atlas database
* Mongoose models for Users, Projects, and Tasks
* JWT authentication
* Protected API routes
* bcrypt password hashing
* Zod request validation

### AI Task Parser

Users can enter a task in normal English.

Example:

> Finish the homepage design by 2026-09-25 with high priority

The Gemini AI parser extracts:

* Task title
* Due date
* Priority

The parsed task is then created and saved directly in MongoDB.

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS

### Backend

* Node.js
* Express.js
* MongoDB Atlas
* Mongoose
* JWT
* bcrypt
* Zod

### AI

* Google Gemini API

## 📁 Project Structure

```text
task-manager-final/
│
├── server/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── validators/
│   └── server.js
│
├── task-manager-react/
├── react-exercise/
├── index.html
├── package.json
└── README.md
```

## 🚀 Running Locally

### Frontend

```bash
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

### Backend

Open another terminal:

```bash
cd server
npm install
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

## 🔐 Environment Variables

Create a `.env` file inside the `server` folder.

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

Do not upload the `.env` file to GitHub.

## 🧪 Backend Testing

The backend APIs were tested using Postman.

Tested features include:

* User Signup
* User Login
* JWT authentication
* Protected routes
* Project creation
* Task creation
* AI task parsing
* MongoDB task creation

## 📌 Week 7 Completion

Week 7 focuses on converting the React Task Manager into a full-stack application with:

* MongoDB database
* Authentication
* JWT authorization
* Password hashing
* Zod validation
* Protected routes
* Gemini AI task parser
* Real database task creation

The AI parser successfully converts a plain-English task sentence into structured task data and saves the task to MongoDB.
