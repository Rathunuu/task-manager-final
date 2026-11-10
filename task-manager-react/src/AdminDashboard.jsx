import { useState, useEffect } from "react";
import { apiRequest } from "./api";

const statusStyle = {
  todo: "bg-slate-100 text-slate-600",
  "in-progress": "bg-yellow-100 text-yellow-700",
  "in-review": "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
};

function AdminDashboard({ currentAdmin, onBack, onLogout }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [form, setForm] = useState({
    title: "",
    priority: "medium",
    dueDate: "",
    project: "",
  });

  // 401 = login expired -> go back to login screen
  const handleError = (err, fallback) => {
    if (err && err.status === 401) {
      onLogout();
      return;
    }
    setError(err?.message || fallback);
  };

  // The overview does not know who is deactivated, so the active flag is
  // taken from the users list and merged in.
  const loadUsers = () => {
    Promise.all([apiRequest("/tasks/admin/overview"), apiRequest("/auth/users")])
      .then(([overview, accounts]) => {
        const activeById = {};
        accounts.forEach((a) => {
          activeById[a._id] = a.active !== false;
        });
        setUsers(
          overview.map((u) => ({ ...u, active: activeById[u._id] !== false }))
        );
      })
      .catch((err) => {
        setUsers([]);
        handleError(err, "Failed to load users");
      });
  };

  // Every project the admin can assign into (admin is not always a member)
  const loadProjects = () => {
    apiRequest("/projects/admin/all")
      .then((data) => {
        setProjects(data);
        // New tasks can only go into projects that are not archived
        const open = data.filter((p) => !p.archived);
        setForm((f) => ({
          ...f,
          project: open.some((p) => p._id === f.project)
            ? f.project
            : open[0]?._id || "",
        }));
      })
      .catch((err) => {
        setProjects([]);
        handleError(err, "Failed to load projects");
      });
  };

  // Progress per project + overdue tasks (an admin sees every project)
  const loadReports = () => {
    Promise.all([
      apiRequest("/reports/progress"),
      apiRequest("/reports/overdue"),
    ])
      .then(([progressData, overdueData]) => {
        setProgress(progressData);
        setOverdue(overdueData);
      })
      .catch((err) => {
        setProgress([]);
        setOverdue([]);
        handleError(err, "Failed to load reports");
      });
  };

  useEffect(() => {
    loadUsers();
    loadProjects();
    loadReports();
  }, []);

  // Deactivate / reactivate: nothing is ever deleted, the user's tasks and
  // memberships stay exactly as they were.
  const toggleActive = async (u) => {
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest(`/auth/users/${u._id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active: !u.active }),
      });
      setSuccess(data.message);
      loadUsers();
    } catch (err) {
      handleError(err, "Failed to update user");
    }
  };

  // Archive / unarchive: only flips a flag, the project and its tasks stay.
  const toggleArchive = async (p) => {
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest(`/projects/${p._id}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ archived: !p.archived }),
      });
      setSuccess(data.message);
      loadProjects();
      loadReports();
    } catch (err) {
      handleError(err, "Failed to update project");
    }
  };

  const toggleRole = async (u) => {
    const newRole = u.role === "admin" ? "user" : "admin";
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/auth/users/${u._id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      loadUsers();
    } catch (err) {
      handleError(err, "Failed to update role");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  };

  const allSelected = users.length > 0 && selectedIds.length === users.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : users.map((u) => u._id));
  };

  const assignTask = async () => {
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Task title is required");
      return;
    }

    if (!form.project) {
      setError("Choose a project for this task");
      return;
    }

    if (selectedIds.length === 0) {
      setError("Select at least one user");
      return;
    }

    setSaving(true);

    try {
      const data = await apiRequest("/tasks/admin/assign", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          priority: form.priority,
          dueDate: form.dueDate || null,
          project: form.project,
          assignedTo: selectedIds,
        }),
      });
      setSuccess(data.message || "Task assigned");
      setForm({ title: "", priority: "medium", dueDate: "", project: form.project });
      setSelectedIds([]);
      loadUsers();
    } catch (err) {
      handleError(err, "Failed to assign task");
    } finally {
      setSaving(false);
    }
  };

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
              Create tasks, assign to multiple users and track progress.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm text-sm">
              <span className="text-slate-400">Logged in as</span>
              <strong className="text-blue-600">{currentAdmin?.name}</strong>
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

        {/* Create & Assign Task */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <span className="text-xs font-bold tracking-widest text-green-600">
            NEW TASK
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Create & Assign Task
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Task title..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="flex-1 min-w-[180px] h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
            />
            <select
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
              className="h-10 px-2 rounded-lg border border-slate-300 bg-white text-sm"
            >
              {projects.length === 0 && <option value="">No projects</option>}
              {projects
                .filter((p) => !p.archived)
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="h-10 px-2 rounded-lg border border-slate-300 bg-white text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="h-10 px-2 rounded-lg border border-slate-300 bg-white text-sm"
            />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">
                Select users ({selectedIds.length} selected)
              </p>
              <button
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
              {users.length === 0 && (
                <p className="text-sm text-slate-400">No users yet.</p>
              )}
              {users.map((u) => (
                <label
                  key={u._id}
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:border-blue-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(u._id)}
                    onChange={() => toggleSelect(u._id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {u.name}
                    </p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  {!u.active && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">
                      Deactivated
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      u.role === "admin"
                        ? "bg-orange-100 text-orange-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {u.role}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          {success && <p className="text-sm text-green-600 mt-3">{success}</p>}

          <button
            onClick={assignTask}
            disabled={saving}
            className="mt-4 h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold transition"
          >
            {saving
              ? "Assigning..."
              : `Assign to ${selectedIds.length} user(s)`}
          </button>
        </section>

        {/* Users overview */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span className="text-xs font-bold tracking-widest text-blue-600">
            OVERVIEW
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">All Users</h2>

          <div className="space-y-3 mt-4">
            {users.length === 0 && (
              <p className="text-sm text-slate-400">No users yet.</p>
            )}

            {users.map((u) => {
              const percent =
                u.total > 0 ? Math.round((u.completed / u.total) * 100) : 0;
              const isExpanded = expandedId === u._id;

              return (
                <div
                  key={u._id}
                  className={`bg-slate-50 border border-slate-200 rounded-xl p-4 ${
                    u.active ? "" : "opacity-60"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <strong className="text-slate-800 text-sm">
                        {u.name}
                      </strong>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          u.role === "admin"
                            ? "bg-orange-100 text-orange-600"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {u.role}
                      </span>

                      {!u.active && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">
                          Deactivated
                        </span>
                      )}

                      {u._id !== currentAdmin?.id && (
                        <button
                          onClick={() => toggleActive(u)}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg border transition ${
                            u.active
                              ? "border-slate-300 text-slate-600 hover:bg-slate-100"
                              : "border-green-200 text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {u.active ? "Deactivate" : "Reactivate"}
                        </button>
                      )}

                      {u._id !== currentAdmin?.id && (
                        <button
                          onClick={() => toggleRole(u)}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg border transition ${
                            u.role === "admin"
                              ? "border-red-200 text-red-600 hover:bg-red-50"
                              : "border-blue-200 text-blue-600 hover:bg-blue-50"
                          }`}
                        >
                          {u.role === "admin" ? "Remove Admin" : "Make Admin"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>
                        {u.completed} of {u.total} tasks done
                      </span>
                      <span>{percent}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : u._id)}
                    className="mt-3 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
                  >
                    {isExpanded ? "Hide tasks ▲" : `View tasks (${u.total}) ▼`}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-2">
                      {u.tasks.length === 0 && (
                        <p className="text-xs text-slate-400">
                          No tasks assigned.
                        </p>
                      )}

                      {u.tasks.map((t) => (
                        <div
                          key={t._id}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-sm text-slate-800">{t.title}</p>
                            <p className="text-[11px] text-slate-400">
                              {t.priority}
                              {t.dueDate
                                ? ` • Due ${new Date(t.dueDate).toLocaleDateString()}`
                                : ""}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              statusStyle[t.status] || statusStyle.todo
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Projects: archive / unarchive (there is no delete button here) */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-6">
          <span className="text-xs font-bold tracking-widest text-purple-600">
            PROJECTS
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            All Projects
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Archived projects disappear from the project switcher but nothing
            is deleted. Unarchive any time.
          </p>

          <div className="space-y-2 mt-4">
            {projects.length === 0 && (
              <p className="text-sm text-slate-400">No projects yet.</p>
            )}

            {projects.map((p) => (
              <div
                key={p._id}
                className={`flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 ${
                  p.archived ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {p.name}
                  </span>
                  {p.archived && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">
                      Archived
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleArchive(p)}
                  className="text-xs font-semibold px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
                >
                  {p.archived ? "Unarchive" : "Archive"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Reports */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-6">
          <span className="text-xs font-bold tracking-widest text-orange-500">
            REPORTS
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Project Progress
          </h2>

          <div className="space-y-3 mt-4">
            {progress.length === 0 && (
              <p className="text-sm text-slate-400">No projects yet.</p>
            )}

            {progress.map((row) => (
              <div
                key={row.projectId}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between text-sm">
                  <strong className="text-slate-800">{row.name}</strong>
                  <span className="text-slate-500">
                    {row.percentComplete}% done ({row.total} tasks)
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${row.percentComplete}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  To do {row.byStatus.todo} • In progress{" "}
                  {row.byStatus["in-progress"]} • In review{" "}
                  {row.byStatus["in-review"]} • Completed{" "}
                  {row.byStatus.completed}
                </p>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-bold text-slate-900 mt-6">
            Overdue Tasks ({overdue.length})
          </h2>

          <div className="space-y-2 mt-3">
            {overdue.length === 0 && (
              <p className="text-sm text-slate-400">Nothing is overdue.</p>
            )}

            {overdue.map((t) => (
              <div
                key={t._id}
                className="bg-white border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
              >
                <div>
                  <p className="text-sm text-slate-800">{t.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {t.project?.name || "No project"}
                    {t.assignedTo ? ` • ${t.assignedTo.name}` : ""}
                    {` • Due ${new Date(t.dueDate).toLocaleDateString()}`}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    statusStyle[t.status] || statusStyle.todo
                  }`}
                >
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;
