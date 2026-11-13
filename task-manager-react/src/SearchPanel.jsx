import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import { logoutUser } from "./auth";

const STATUS_LABELS = {
  todo: "To Do",
  "in-progress": "In Progress",
  "in-review": "In Review",
  completed: "Done",
};

const emptyFilters = {
  q: "",
  project: "",
  assignee: "",
  status: "",
  priority: "",
  includeArchived: false,
};

// Search across ALL the projects the user belongs to (the server only ever
// searches projects the user is a member of). Archived projects are left
// out unless the box is ticked.
//
// props:
//   projects       the user's projects, [{ id, name }]
//   onOpenResult   called with (projectId, taskId) when a result is opened
function SearchPanel({ projects, onOpenResult }) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [assignees, setAssignees] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 401 = login expired -> clear login and go back to the login screen
  function handleError(err, fallback) {
    if (err && err.status === 401) {
      logoutUser();
      window.location.reload();
      return;
    }

    setError(err?.message || fallback);
  }

  // People who can be picked in the "Assigned to" filter: everyone who has
  // a task in the user's projects
  useEffect(() => {
    if (!open || assignees.length > 0) return;

    apiRequest("/tasks")
      .then((tasks) => {
        const byId = new Map();

        tasks.forEach((task) => {
          if (task.assignedTo && task.assignedTo._id) {
            byId.set(task.assignedTo._id, task.assignedTo.name);
          }
        });

        setAssignees(
          [...byId.entries()].map(([id, name]) => ({ id, name }))
        );
      })
      .catch(() => setAssignees([]));
  }, [open]);

  function update(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function handleSearch(event) {
    event.preventDefault();

    const params = new URLSearchParams();

    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.project) params.set("project", filters.project);
    if (filters.assignee) params.set("assignee", filters.assignee);
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.includeArchived) params.set("includeArchived", "true");

    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(`/search?${params.toString()}`);
      setResults(data);
    } catch (err) {
      setResults(null);
      handleError(err, "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setFilters(emptyFilters);
    setResults(null);
    setError("");
  }

  const fieldClass =
    "w-full h-10 px-2 rounded-lg border border-slate-300 bg-white text-sm outline-none focus:border-blue-500";
  const labelClass = "block text-xs font-bold text-slate-700 mb-1";

  return (
    <section
      className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm"
      aria-label="Search all projects"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="search-panel-body"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800"
      >
        <span>Search all projects</span>
        <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div id="search-panel-body" className="px-4 pb-4">
          <form onSubmit={handleSearch}>
            <div className="mb-3">
              <label htmlFor="search-q" className={labelClass}>
                Words in the title or description
              </label>
              <input
                id="search-q"
                type="search"
                value={filters.q}
                onChange={(e) => update("q", e.target.value)}
                placeholder="Search all projects..."
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label htmlFor="search-project" className={labelClass}>
                  Project
                </label>
                <select
                  id="search-project"
                  value={filters.project}
                  onChange={(e) => update("project", e.target.value)}
                  className={fieldClass}
                >
                  <option value="">All projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="search-assignee" className={labelClass}>
                  Assigned to
                </label>
                <select
                  id="search-assignee"
                  value={filters.assignee}
                  onChange={(e) => update("assignee", e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Anyone</option>
                  {assignees.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="search-status" className={labelClass}>
                  Status
                </label>
                <select
                  id="search-status"
                  value={filters.status}
                  onChange={(e) => update("status", e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Any status</option>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="in-review">In Review</option>
                  <option value="completed">Done</option>
                </select>
              </div>

              <div>
                <label htmlFor="search-priority" className={labelClass}>
                  Priority
                </label>
                <select
                  id="search-priority"
                  value={filters.priority}
                  onChange={(e) => update("priority", e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Any priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="search-archived"
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <input
                  id="search-archived"
                  type="checkbox"
                  checked={filters.includeArchived}
                  onChange={(e) => update("includeArchived", e.target.checked)}
                />
                Include archived projects
              </label>

              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold"
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <p role="alert" className="text-sm text-red-700 mt-3">
              {error}
            </p>
          )}

          <div aria-live="polite" className="mt-3">
            {results && (
              <p className="text-sm text-slate-700 mb-2">
                {results.length === 0
                  ? "No tasks found."
                  : `${results.length} task(s) found.`}
              </p>
            )}

            <ul className="space-y-2">
              {(results || []).map((task) => (
                <li
                  key={task._id}
                  className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-600">
                      {task.project?.name || "No project"}
                      {task.assignedTo ? ` • ${task.assignedTo.name}` : ""}
                      {` • ${STATUS_LABELS[task.status] || task.status}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenResult(task.project?._id, task._id)
                    }
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    Open
                    <span className="sr-only"> {task.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

export default SearchPanel;
