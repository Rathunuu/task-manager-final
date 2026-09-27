import { useState } from "react";
import { registerUser, getAllUsers } from "./auth";
import {
  loadTasksForUser,
  saveTasksForUser,
  loadProjectsForUser,
  saveProjectsForUser,
} from "./storage";

function AdminDashboard({ currentAdmin, onBack, onLogout }) {
  const [, forceRefresh] = useState(0);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [addUserMessage, setAddUserMessage] = useState(null);

  const [assignTargetUser, setAssignTargetUser] = useState("");
  const [assignText, setAssignText] = useState("");
  const [assignCategory, setAssignCategory] = useState("Work");
  const [assignPriority, setAssignPriority] = useState("Normal");
  const [assignStatus, setAssignStatus] = useState("To Do");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignMessage, setAssignMessage] = useState(null);

  const users = getAllUsers();
  const otherUsers = users.filter((u) => u.username !== currentAdmin);

  function refresh() {
    forceRefresh((n) => n + 1);
  }

  function handleAddUser(e) {
    e.preventDefault();

    const result = registerUser(newUsername.trim(), newPassword, newRole);

    if (!result.success) {
      setAddUserMessage({ text: result.message, error: true });
      return;
    }

    setAddUserMessage({
      text: `User "${newUsername.trim()}" created successfully.`,
      error: false,
    });
    setNewUsername("");
    setNewPassword("");
    setNewRole("user");
    refresh();
  }

  function handleAssignTask(e) {
    e.preventDefault();

    if (!assignTargetUser) {
      setAssignMessage({ text: "Please add a user first.", error: true });
      return;
    }

    const text = assignText.trim();
    if (!text) {
      setAssignMessage({ text: "Please enter a task.", error: true });
      return;
    }

    let projects = loadProjectsForUser(assignTargetUser);
    if (projects.length === 0) {
      projects = [{ id: crypto.randomUUID(), name: "My Project" }];
      saveProjectsForUser(assignTargetUser, projects);
    }
    const targetProjectId = projects[0].id;

    const tasks = loadTasksForUser(assignTargetUser);

    tasks.push({
      id: crypto.randomUUID(),
      projectId: targetProjectId,
      text,
      category: assignCategory,
      status: assignStatus,
      done: assignStatus === "Done",
      description: "",
      dueDate: assignDueDate,
      priority: assignPriority,
      notes: "",
      subtasks: [],
      assignedBy: currentAdmin,
      createdAt: Date.now(),
    });

    saveTasksForUser(assignTargetUser, tasks);

    setAssignMessage({
      text: `Task assigned to "${assignTargetUser}".`,
      error: false,
    });
    setAssignText("");
    setAssignDueDate("");
    setAssignStatus("To Do");
    refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold tracking-widest text-orange-500">
              ADMIN
            </span>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">
              Admin Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage users and assign tasks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm text-sm">
              <span className="text-slate-400">Logged in as</span>
              <strong className="text-blue-600">{currentAdmin}</strong>
              <button
                onClick={onLogout}
                className="ml-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 text-xs font-semibold transition"
              >
                Log Out
              </button>
            </div>
            <button
              onClick={onBack}
              className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:border-blue-400 transition"
            >
              My Tasks
            </button>
          </div>
        </header>

        {/* ADD USER */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <span className="text-xs font-bold tracking-widest text-blue-600">
            USERS
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Add New User
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Create a login for a team member or another admin.
          </p>

          <form
            onSubmit={handleAddUser}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. priya"
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Set a password"
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
            >
              + Add User
            </button>
          </form>

          {addUserMessage && (
            <div
              className={`mt-4 px-3 py-2 rounded-lg text-xs font-semibold ${
                addUserMessage.error
                  ? "bg-red-50 border border-red-200 text-red-600"
                  : "bg-green-50 border border-green-200 text-green-700"
              }`}
            >
              {addUserMessage.text}
            </div>
          )}
        </section>

        {/* ASSIGN TASK */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <span className="text-xs font-bold tracking-widest text-blue-600">
            TASKS
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Assign a Task
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Give a task directly to a user's task list.
          </p>

          <form
            onSubmit={handleAssignTask}
            className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Assign to
              </label>
              <select
                value={assignTargetUser}
                onChange={(e) => setAssignTargetUser(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Select user</option>
                {otherUsers.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Task
              </label>
              <input
                type="text"
                value={assignText}
                onChange={(e) => setAssignText(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Category
              </label>
              <select
                value={assignCategory}
                onChange={(e) => setAssignCategory(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              >
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Priority
              </label>
              <select
                value={assignPriority}
                onChange={(e) => setAssignPriority(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Status
              </label>
              <select
                value={assignStatus}
                onChange={(e) => setAssignStatus(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Due date
              </label>
              <input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition md:col-span-6"
            >
              + Assign Task
            </button>
          </form>

          {assignMessage && (
            <div
              className={`mt-4 px-3 py-2 rounded-lg text-xs font-semibold ${
                assignMessage.error
                  ? "bg-red-50 border border-red-200 text-red-600"
                  : "bg-green-50 border border-green-200 text-green-700"
              }`}
            >
              {assignMessage.text}
            </div>
          )}
        </section>

        {/* OVERVIEW */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span className="text-xs font-bold tracking-widest text-blue-600">
            OVERVIEW
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            All Users &amp; Their Tasks
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            See what everyone has been working on.
          </p>

          <div className="space-y-4">
            {users.length === 0 && (
              <p className="text-sm text-slate-400">No users yet.</p>
            )}

            {users.map((u) => {
              const tasks = loadTasksForUser(u.username);
              const done = tasks.filter((t) => t.status === "Done").length;

              return (
                <div
                  key={u.username}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-800 text-sm">
                        {u.username}
                      </strong>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          u.role === "admin"
                            ? "bg-orange-100 text-orange-600"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {u.role}
                      </span>
                      {u.username === currentAdmin && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {done} of {tasks.length} tasks done
                    </span>
                  </div>

                  {tasks.length === 0 ? (
                    <p className="text-xs text-slate-400">No tasks yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {tasks.map((t) => (
                        <li
                          key={t.id}
                          className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                          <span className="flex-1 min-w-[100px] font-semibold text-slate-700">
                            {t.text}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {t.status || "To Do"}
                          </span>
                          {t.assignedBy && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                              Assigned by {t.assignedBy}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;