import { useState, useEffect } from "react";
import { apiRequest } from "./api";

const statusStyle = {
  todo: "bg-slate-100 text-slate-600",
  "in-progress": "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

function AdminDashboard({ currentAdmin, onBack, onLogout }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [assignId, setAssignId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    priority: "medium",
    dueDate: "",
  });

  const loadUsers = () => {
    apiRequest("/tasks/admin/overview")
      .then(setUsers)
      .catch((err) => {
        setUsers([]);
        setError(err.message || "Failed to load users");
      });
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
      setError(err.message || "Failed to update role");
    }
  };

  const assignTask = async (u) => {
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Task title is required");
      return;
    }

    try {
      await apiRequest("/tasks/admin/assign", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          priority: form.priority,
          dueDate: form.dueDate || null,
          assignedTo: u._id,
        }),
      });
      setSuccess(`Task assigned to ${u.name}`);
      setForm({ title: "", priority: "medium", dueDate: "" });
      setAssignId(null);
      setExpandedId(u._id);
      loadUsers();
    } catch (err) {
      setError(err.message || "Failed to assign task");
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
              View users, assign tasks and track progress.
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

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span className="text-xs font-bold tracking-widest text-blue-600">
            OVERVIEW
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">All Users</h2>

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          {success && <p className="text-sm text-green-600 mt-3">{success}</p>}

          <div className="space-y-3 mt-4">
            {users.length === 0 && (
              <p className="text-sm text-slate-400">No users yet.</p>
            )}

            {users.map((u) => {
              const percent =
                u.total > 0 ? Math.round((u.completed / u.total) * 100) : 0;
              const isExpanded = expandedId === u._id;
              const isAssigning = assignId === u._id;

              return (
                <div
                  key={u._id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4"
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

                      <button
                        onClick={() => {
                          setAssignId(isAssigning ? null : u._id);
                          setError("");
                          setSuccess("");
                        }}
                        className="text-xs font-semibold px-3 py-1 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition"
                      >
                        + Assign Task
                      </button>

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

                  {/* Progress */}
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

                  {/* Assign Task form */}
                  {isAssigning && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        type="text"
                        placeholder="Task title..."
                        value={form.title}
                        onChange={(e) =>
                          setForm({ ...form, title: e.target.value })
                        }
                        className="flex-1 min-w-[160px] h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm"
                      />
                      <select
                        value={form.priority}
                        onChange={(e) =>
                          setForm({ ...form, priority: e.target.value })
                        }
                        className="h-9 px-2 rounded-lg border border-slate-300 bg-white text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) =>
                          setForm({ ...form, dueDate: e.target.value })
                        }
                        className="h-9 px-2 rounded-lg border border-slate-300 bg-white text-sm"
                      />
                      <button
                        onClick={() => assignTask(u)}
                        className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                      >
                        Assign
                      </button>
                    </div>
                  )}

                  {/* Tasks list toggle */}
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
      </div>
    </div>
  );
}

export default AdminDashboard;
