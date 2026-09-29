import { useState, useEffect } from "react";
import { apiRequest } from "./api";

function AdminDashboard({ currentAdmin, onBack, onLogout }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    apiRequest("/auth/users")
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

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
              View users.
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

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <span className="text-xs font-bold tracking-widest text-blue-600">
            OVERVIEW
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            All Users
          </h2>

          <div className="space-y-3 mt-4">
            {users.length === 0 && (
              <p className="text-sm text-slate-400">No users yet.</p>
            )}

            {users.map((u) => (
              <div
                key={u._id || u.email}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <strong className="text-slate-800 text-sm">{u.name}</strong>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    u.role === "admin"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {u.role}
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