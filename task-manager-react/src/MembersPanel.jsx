import { useState, useEffect } from "react";
import { apiRequest } from "./api";

function MembersPanel({ project, currentUserId, onUnauthorized }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");

  function handleError(error) {
    if (error.status === 401 && onUnauthorized) {
      onUnauthorized(error);
      return;
    }

    setNotice(error.message || "Something went wrong");
  }

  async function loadMembers() {
    try {
      setLoading(true);
      const data = await apiRequest(`/projects/${project.id}/members`);
      setMembers(data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setNotice("");
    setEmail("");
    loadMembers();
  }, [project.id]);

  async function handleAdd(e) {
    e.preventDefault();

    const trimmed = email.trim();
    if (trimmed === "") return;

    try {
      setBusy(true);
      setNotice("");

      const data = await apiRequest(`/projects/${project.id}/members`, {
        method: "POST",
        body: JSON.stringify({ email: trimmed }),
      });

      setMembers(data.members);
      setEmail("");
      setNotice("Member added.");
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(member) {
    const label = member.user?.name || member.user?.email || "this member";

    if (!window.confirm(`Remove ${label} from this project?`)) return;

    try {
      setBusy(true);
      setNotice("");

      const data = await apiRequest(
        `/projects/${project.id}/members/${member.user._id}`,
        { method: "DELETE" }
      );

      setMembers(data.members);
      setNotice("Member removed.");
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-3">
        Members of {project.name}
      </h3>

      {loading && (
        <p className="text-sm text-slate-500 mb-2">Loading members...</p>
      )}

      <ul className="mb-3 divide-y divide-slate-100">
        {members.map((member) => (
          <li
            key={member.user._id}
            className="flex items-center justify-between gap-2 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {member.user.name}
                {String(member.user._id) === String(currentUserId) && (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    (you)
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {member.user.email}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-2 py-1 rounded-md text-xs font-semibold ${
                  member.role === "owner"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {member.role}
              </span>

              <button
                onClick={() => handleRemove(member)}
                disabled={busy}
                className="px-2 py-1 rounded-md text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Add member by email..."
          className="flex-1 min-w-[180px] h-10 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {notice && <p className="mt-2 text-sm text-slate-600">{notice}</p>}
    </div>
  );
}

export default MembersPanel;
