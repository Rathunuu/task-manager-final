import { useState, useEffect } from "react";
import ProjectSwitcher from "./ProjectSwitcher";
import Controls from "./Controls";
import TaskList from "./TaskList";
import Board from "./Board";
import TaskDetailDialog from "./TaskDetailDialog";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import AdminDashboard from "./AdminDashboard";
import { loadTasks, saveTasks, loadProjects, saveProjects } from "./storage";
import { getCurrentUser, getCurrentUserRole, logoutUser } from "./auth";

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [page, setPage] = useState("login"); // "login" | "signup" | "app" | "admin"

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);

  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("Work");
  const [newTaskStatus, setNewTaskStatus] = useState("To Do");

  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [currentView, setCurrentView] = useState("list");

  const [activeDetailTaskId, setActiveDetailTaskId] = useState(null);
  const [undoData, setUndoData] = useState(null);

  // ---------- AUTH CHECK (runs once on first load) ----------
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setAuthUser(user);
      setPage("app");
    } else {
      setPage("login");
    }
    setAuthChecked(true);
  }, []);

  // ---------- LOAD DATA (whenever the logged-in user changes) ----------
  useEffect(() => {
    if (!authUser) return;

    const loadedProjects = loadProjects();
    const loadedTasks = loadTasks();
    setProjects(loadedProjects);
    setTasks(loadedTasks);
    if (loadedProjects.length > 0) {
      setActiveProjectId(loadedProjects[0].id);
    } else {
      setActiveProjectId(null);
    }
  }, [authUser]);

  function handleLoginSuccess() {
    setAuthUser(getCurrentUser());
    setPage("app");
  }

  function handleLogout() {
    logoutUser();
    setAuthUser(null);
    setTasks([]);
    setProjects([]);
    setActiveProjectId(null);
    setPage("login");
  }

  function persistTasks(updated) {
    setTasks(updated);
    saveTasks(updated);
  }

  function persistProjects(updated) {
    setProjects(updated);
    saveProjects(updated);
  }

  // ---------- PROJECT ----------
  function handleCreateProject(name) {
    const newProject = { id: crypto.randomUUID(), name };
    const updated = [...projects, newProject];
    persistProjects(updated);
    setActiveProjectId(newProject.id);
  }

  // ---------- ADD TASK ----------
  function handleAddTask() {
    const text = newTaskText.trim();
    if (text === "" || !activeProjectId) return;

    const newTask = {
      id: crypto.randomUUID(),
      projectId: activeProjectId,
      text,
      category: newTaskCategory,
      status: newTaskStatus,
      done: newTaskStatus === "Done",
      description: "",
      dueDate: "",
      priority: "Normal",
      notes: "",
      subtasks: [],
      createdAt: Date.now(),
    };

    persistTasks([...tasks, newTask]);
    setNewTaskText("");
  }

  // ---------- DELETE TASK (with undo) ----------
  function handleDeleteTask(taskId) {
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index === -1) return;
    const removed = tasks[index];

    const updated = tasks.filter((t) => t.id !== taskId);
    persistTasks(updated);

    setUndoData({ task: removed, index });
    setTimeout(() => setUndoData(null), 5000);
  }

  function handleUndo() {
    if (!undoData) return;
    const updated = [...tasks];
    updated.splice(undoData.index, 0, undoData.task);
    persistTasks(updated);
    setUndoData(null);
  }

  // ---------- STATUS ----------
  function handleStatusChange(taskId, newStatus) {
    const updated = tasks.map((t) =>
      t.id === taskId
        ? { ...t, status: newStatus, done: newStatus === "Done" }
        : t
    );
    persistTasks(updated);
  }

  // ---------- GENERIC FIELD UPDATE ----------
  function handleUpdateField(taskId, field, value) {
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const newTask = { ...t, [field]: value };
      if (field === "status") newTask.done = value === "Done";
      return newTask;
    });
    persistTasks(updated);
  }

  // ---------- SUBTASKS ----------
  function handleAddSubtask(taskId, text) {
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const subtasks = [
        ...(t.subtasks || []),
        { id: crypto.randomUUID(), text, done: false },
      ];
      return { ...t, subtasks };
    });
    persistTasks(updated);
  }

  function handleToggleSubtask(taskId, subtaskId) {
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const subtasks = (t.subtasks || []).map((s) =>
        s.id === subtaskId ? { ...s, done: !s.done } : s
      );
      return { ...t, subtasks };
    });
    persistTasks(updated);
  }

  function handleDeleteSubtask(taskId, subtaskId) {
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const subtasks = (t.subtasks || []).filter((s) => s.id !== subtaskId);
      return { ...t, subtasks };
    });
    persistTasks(updated);
  }

  // ---------- REORDER ----------
  function handleReorder(orderedIds) {
    const projectTasksMap = new Map(
      tasks
        .filter((t) => t.projectId === activeProjectId)
        .map((t) => [t.id, t])
    );
    const reordered = orderedIds
      .map((id) => projectTasksMap.get(id))
      .filter(Boolean);
    const otherTasks = tasks.filter((t) => t.projectId !== activeProjectId);
    persistTasks([...otherTasks, ...reordered]);
  }

  // ---------- EXPORT / IMPORT ----------
  function handleExport() {
    const data = { projects, tasks };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tasks.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.projects && data.tasks) {
          persistProjects(data.projects);
          persistTasks(data.tasks);
          if (data.projects.length > 0)
            setActiveProjectId(data.projects[0].id);
        }
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ---------- AUTH GATE ----------
  if (!authChecked) {
    return null;
  }

  if (page === "login") {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onSwitchToSignup={() => setPage("signup")}
      />
    );
  }

  if (page === "signup") {
    return (
      <SignupPage
        onSignupSuccess={handleLoginSuccess}
        onSwitchToLogin={() => setPage("login")}
      />
    );
  }

  if (page === "admin") {
    return (
      <AdminDashboard
        currentAdmin={authUser}
        onBack={() => setPage("app")}
        onLogout={handleLogout}
      />
    );
  }

  // ---------- FILTER / SEARCH / SORT ----------
  let visibleTasks = tasks.filter((t) => t.projectId === activeProjectId);

  if (activeCategory !== "All") {
    visibleTasks = visibleTasks.filter((t) => t.category === activeCategory);
  }

  if (searchText.trim() !== "") {
    visibleTasks = visibleTasks.filter((t) =>
      t.text.toLowerCase().includes(searchText.toLowerCase())
    );
  }

  visibleTasks = [...visibleTasks].sort((a, b) => {
    if (sortBy === "az") return a.text.localeCompare(b.text);
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const projectTasks = tasks.filter((t) => t.projectId === activeProjectId);
  const completedCount = projectTasks.filter(
    (t) => t.status === "Done"
  ).length;

  const activeDetailTask = tasks.find((t) => t.id === activeDetailTaskId) || null;

  /*
     THE ACTUAL FIX for last week's bug:
     the Admin Dashboard link/button is only
     ever rendered when role === "admin".
     A CSS "hidden" attribute can be overridden
     by a stray rule; an element that never
     mounts in the DOM can't be shown by CSS.
  */
  const role = getCurrentUserRole();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold tracking-widest text-blue-600">
              PRODUCTIVITY
            </span>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">
              Task Manager
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Organize your work. Stay focused.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm text-sm">
              <span className="text-slate-400">Logged in as</span>
              <strong className="text-blue-600">{authUser}</strong>
              <button
                onClick={handleLogout}
                className="ml-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 text-xs font-semibold transition"
              >
                Log Out
              </button>
            </div>

            {role === "admin" && (
              <button
                onClick={() => setPage("admin")}
                className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:border-blue-400 transition"
              >
                Admin Dashboard
              </button>
            )}
          </div>
        </header>

        <ProjectSwitcher
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
          onCreateProject={handleCreateProject}
        />

        {activeProject && (
          <p className="text-slate-500 text-sm mb-4">
            <strong className="text-slate-800">{activeProject.name}</strong> —{" "}
            {completedCount} of {projectTasks.length} tasks done
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            placeholder="New task..."
            className="flex-1 min-w-[150px] h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
          />
          <select
            value={newTaskCategory}
            onChange={(e) => setNewTaskCategory(e.target.value)}
            className="h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
          >
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="Urgent">Urgent</option>
          </select>
          <select
            value={newTaskStatus}
            onChange={(e) => setNewTaskStatus(e.target.value)}
            className="h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
          >
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Done">Done</option>
          </select>
          <button
            onClick={handleAddTask}
            className="h-11 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
          >
            Add Task
          </button>
        </div>

        <Controls
          searchText={searchText}
          onSearchChange={setSearchText}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {currentView === "list" ? (
          <TaskList
            tasks={visibleTasks}
            onOpenTask={setActiveDetailTaskId}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onReorder={handleReorder}
          />
        ) : (
          <Board
            tasks={visibleTasks}
            onOpenTask={setActiveDetailTaskId}
            onStatusChange={handleStatusChange}
          />
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={handleExport}
            className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:border-blue-400 transition"
          >
            Export JSON
          </button>
          <label className="h-10 px-4 flex items-center rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:border-blue-400 transition cursor-pointer">
            Import JSON
            <input type="file" accept=".json" onChange={handleImport} hidden />
          </label>
        </div>

        <TaskDetailDialog
          task={activeDetailTask}
          onClose={() => setActiveDetailTaskId(null)}
          onUpdateField={handleUpdateField}
          onAddSubtask={handleAddSubtask}
          onToggleSubtask={handleToggleSubtask}
          onDeleteSubtask={handleDeleteSubtask}
        />

        {undoData && (
          <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-4">
            <span className="text-sm">Task deleted</span>
            <button
              onClick={handleUndo}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;