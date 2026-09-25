import { useState, useEffect } from "react";
import ProjectSwitcher from "./ProjectSwitcher";
import Controls from "./Controls";
import TaskList from "./TaskList";
import Board from "./Board";
import TaskDetailDialog from "./TaskDetailDialog";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import AdminDashboard from "./AdminDashboard";
import { apiRequest } from "./api";
import { getCurrentUser, getCurrentUserRole, logoutUser } from "./auth";

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [page, setPage] = useState("login");

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

  const [loadingData, setLoadingData] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ---------- HELPERS ----------

  function getProjectId(project) {
    if (!project) return null;
    return project._id || project.id || project;
  }

  function getTaskProjectId(task) {
    if (!task) return null;

    if (typeof task.project === "object" && task.project !== null) {
      return task.project._id || task.project.id || null;
    }

    return task.projectId || task.project || null;
  }

  function convertStatusFromBackend(status) {
    if (status === "completed") return "Done";
    if (status === "in-progress") return "In Progress";
    return "To Do";
  }

  function convertStatusToBackend(status) {
    if (status === "Done") return "completed";
    if (status === "In Progress") return "in-progress";
    if (status === "In Review") return "in-progress";
    return "todo";
  }

  function convertPriorityFromBackend(priority) {
    if (priority === "high") return "High";
    if (priority === "low") return "Low";
    return "Normal";
  }

  function convertPriorityToBackend(priority) {
    if (priority === "High") return "high";
    if (priority === "Low") return "low";
    return "medium";
  }

  function normalizeProject(project) {
    return {
      id: project._id || project.id,
      name: project.name,
      description: project.description || "",
    };
  }

  function normalizeTask(task) {
    const projectId = getTaskProjectId(task);

    return {
      id: task._id || task.id,
      projectId,
      text: task.title || task.text || "",
      category: task.category || "Work",
      status: convertStatusFromBackend(task.status),
      done: task.status === "completed",
      description: task.description || "",
      dueDate: task.dueDate
        ? String(task.dueDate).slice(0, 10)
        : "",
      priority: convertPriorityFromBackend(task.priority),
      notes: task.notes || "",
      subtasks: task.subtasks || [],
      assignedTo: task.assignedTo || null,
      createdBy: task.createdBy || null,
      createdAt: task.createdAt
        ? new Date(task.createdAt).getTime()
        : Date.now(),
    };
  }

  function taskToBackend(task) {
    return {
      title: task.text,
      description: task.description || "",
      dueDate: task.dueDate || null,
      priority: convertPriorityToBackend(task.priority),
      status: convertStatusToBackend(task.status),
      project: task.projectId,
      assignedTo:
        typeof task.assignedTo === "object"
          ? task.assignedTo?._id || null
          : task.assignedTo || null,
    };
  }

  // ---------- AUTH CHECK ----------

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

  // ---------- LOAD FROM MONGODB ----------

  useEffect(() => {
    if (!authUser) return;

    async function loadBackendData() {
      setLoadingData(true);
      setMessage("");

      try {
        const [projectsData, tasksData] = await Promise.all([
          apiRequest("/projects"),
          apiRequest("/tasks"),
        ]);

        const normalizedProjects = projectsData.map(normalizeProject);
        const normalizedTasks = tasksData.map(normalizeTask);

        setProjects(normalizedProjects);
        setTasks(normalizedTasks);

        if (normalizedProjects.length > 0) {
          setActiveProjectId(normalizedProjects[0].id);
        } else {
          setActiveProjectId(null);
        }
      } catch (error) {
        console.error("Failed to load backend data:", error);
        setMessage(error.message);
      } finally {
        setLoadingData(false);
      }
    }

    loadBackendData();
  }, [authUser]);

  // ---------- LOGIN ----------

  function handleLoginSuccess(user) {
    setAuthUser(user);
    setPage("app");
  }

  // ---------- LOGOUT ----------

  function handleLogout() {
    logoutUser();

    setAuthUser(null);
    setTasks([]);
    setProjects([]);
    setActiveProjectId(null);
    setPage("login");
  }

  // ---------- PROJECT ----------

  async function handleCreateProject(name) {
    if (!name || !name.trim()) return;

    setActionLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: "",
        }),
      });

      const createdProject = normalizeProject(data.project);

      setProjects((current) => [
        ...current,
        createdProject,
      ]);

      setActiveProjectId(createdProject.id);

      setMessage("Project created successfully.");
    } catch (error) {
      console.error("Create project error:", error);
      setMessage(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  // ---------- ADD NORMAL TASK ----------

  async function handleAddTask() {
    const text = newTaskText.trim();

    if (text === "" || !activeProjectId) {
      return;
    }

    setActionLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: text,
          description: "",
          dueDate: null,
          priority: "medium",
          status: convertStatusToBackend(newTaskStatus),
          project: activeProjectId,
          assignedTo: null,
        }),
      });

      const createdTask = normalizeTask(data.task);

      setTasks((current) => [
        createdTask,
        ...current,
      ]);

      setNewTaskText("");

      setMessage("Task created successfully.");
    } catch (error) {
      console.error("Create task error:", error);
      setMessage(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  // ---------- AI TASK PARSER ----------

  async function handleAIAddTask() {
    const text = newTaskText.trim();

    if (text === "" || !activeProjectId) {
      return;
    }

    setActionLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/tasks/parse", {
        method: "POST",
        body: JSON.stringify({
          text,
          project: activeProjectId,
        }),
      });

      const createdTask = normalizeTask(data.task);

      setTasks((current) => [
        createdTask,
        ...current,
      ]);

      setNewTaskText("");

      setMessage(
        "AI parsed the task and saved it to MongoDB."
      );
    } catch (error) {
      console.error("AI task parser error:", error);
      setMessage(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  // ---------- DELETE TASK ----------

  async function handleDeleteTask(taskId) {
    const index = tasks.findIndex(
      (task) => task.id === taskId
    );

    if (index === -1) return;

    const removed = tasks[index];

    setActionLoading(true);
    setMessage("");

    try {
      await apiRequest(`/tasks/${taskId}`, {
        method: "DELETE",
      });

      setTasks((current) =>
        current.filter(
          (task) => task.id !== taskId
        )
      );

      setUndoData({
        task: removed,
        index,
      });

      setTimeout(() => {
        setUndoData(null);
      }, 5000);

      setMessage("Task deleted.");
    } catch (error) {
      console.error("Delete task error:", error);
      setMessage(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  // ---------- UNDO DELETE ----------

  async function handleUndo() {
    if (!undoData) return;

    const task = undoData.task;

    setActionLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify(
          taskToBackend(task)
        ),
      });

      const recreatedTask =
        normalizeTask(data.task);

      setTasks((current) => {
        const updated = [...current];

        updated.splice(
          Math.min(
            undoData.index,
            updated.length
          ),
          0,
          recreatedTask
        );

        return updated;
      });

      setUndoData(null);
      setMessage("Task restored.");
    } catch (error) {
      console.error("Undo task error:", error);
      setMessage(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  // ---------- STATUS ----------

  async function handleStatusChange(
    taskId,
    newStatus
  ) {
    const currentTask = tasks.find(
      (task) => task.id === taskId
    );

    if (!currentTask) return;

    const updatedTask = {
      ...currentTask,
      status: newStatus,
      done: newStatus === "Done",
    };

    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? updatedTask
          : task
      )
    );

    try {
      const data = await apiRequest(
        `/tasks/${taskId}`,
        {
          method: "PUT",
          body: JSON.stringify(
            taskToBackend(updatedTask)
          ),
        }
      );

      const savedTask =
        normalizeTask(data.task);

      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? savedTask
            : task
        )
      );
    } catch (error) {
      console.error("Status update error:", error);
      setMessage(error.message);
    }
  }

  // ---------- FIELD UPDATE ----------

  async function handleUpdateField(
    taskId,
    field,
    value
  ) {
    const currentTask = tasks.find(
      (task) => task.id === taskId
    );

    if (!currentTask) return;

    const updatedTask = {
      ...currentTask,
      [field]: value,
    };

    if (field === "status") {
      updatedTask.done =
        value === "Done";
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? updatedTask
          : task
      )
    );

    try {
      const data = await apiRequest(
        `/tasks/${taskId}`,
        {
          method: "PUT",
          body: JSON.stringify(
            taskToBackend(updatedTask)
          ),
        }
      );

      const savedTask =
        normalizeTask(data.task);

      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? savedTask
            : task
        )
      );
    } catch (error) {
      console.error("Update task error:", error);
      setMessage(error.message);
    }
  }

  // ---------- SUBTASKS ----------

  function handleAddSubtask(taskId, text) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          subtasks: [
            ...(task.subtasks || []),
            {
              id: crypto.randomUUID(),
              text,
              done: false,
            },
          ],
        };
      })
    );
  }

  function handleToggleSubtask(
    taskId,
    subtaskId
  ) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          subtasks: (task.subtasks || []).map(
            (subtask) =>
              subtask.id === subtaskId
                ? {
                    ...subtask,
                    done: !subtask.done,
                  }
                : subtask
          ),
        };
      })
    );
  }

  function handleDeleteSubtask(
    taskId,
    subtaskId
  ) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          subtasks: (
            task.subtasks || []
          ).filter(
            (subtask) =>
              subtask.id !== subtaskId
          ),
        };
      })
    );
  }

  // ---------- REORDER ----------

  function handleReorder(orderedIds) {
    const projectTasksMap =
      new Map(
        tasks
          .filter(
            (task) =>
              task.projectId ===
              activeProjectId
          )
          .map((task) => [
            task.id,
            task,
          ])
      );

    const reordered =
      orderedIds
        .map((id) =>
          projectTasksMap.get(id)
        )
        .filter(Boolean);

    const otherTasks =
      tasks.filter(
        (task) =>
          task.projectId !==
          activeProjectId
      );

    setTasks([
      ...otherTasks,
      ...reordered,
    ]);
  }

  // ---------- EXPORT ----------

  function handleExport() {
    const data = {
      projects,
      tasks,
    };

    const blob = new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        ),
      ],
      {
        type: "application/json",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = "tasks.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  // ---------- IMPORT ----------

  async function handleImport(e) {
    const file = e.target.files[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = async (event) => {
      try {
        const data =
          JSON.parse(
            event.target.result
          );

        if (
          !Array.isArray(
            data.projects
          ) ||
          !Array.isArray(
            data.tasks
          )
        ) {
          alert(
            "Invalid JSON file."
          );
          return;
        }

        setActionLoading(true);

        const importedProjectMap =
          new Map();

        for (
          const project of data.projects
        ) {
          const response =
            await apiRequest(
              "/projects",
              {
                method: "POST",
                body: JSON.stringify({
                  name:
                    project.name ||
                    "Imported Project",
                  description:
                    project.description ||
                    "",
                }),
              }
            );

          const createdProject =
            normalizeProject(
              response.project
            );

          importedProjectMap.set(
            project.id,
            createdProject.id
          );

          setProjects((current) => [
            ...current,
            createdProject,
          ]);
        }

        for (
          const task of data.tasks
        ) {
          const projectId =
            importedProjectMap.get(
              task.projectId
            );

          if (!projectId) {
            continue;
          }

          const response =
            await apiRequest(
              "/tasks",
              {
                method: "POST",
                body: JSON.stringify({
                  title:
                    task.text ||
                    "Imported Task",
                  description:
                    task.description ||
                    "",
                  dueDate:
                    task.dueDate ||
                    null,
                  priority:
                    convertPriorityToBackend(
                      task.priority
                    ),
                  status:
                    convertStatusToBackend(
                      task.status
                    ),
                  project: projectId,
                  assignedTo: null,
                }),
              }
            );

          const createdTask =
            normalizeTask(
              response.task
            );

          setTasks((current) => [
            ...current,
            createdTask,
          ]);
        }

        setMessage(
          "JSON imported successfully."
        );
      } catch (error) {
        console.error(
          "Import error:",
          error
        );

        alert(
          "Could not import JSON."
        );

        setMessage(
          error.message
        );
      } finally {
        setActionLoading(false);
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
        onLoginSuccess={
          handleLoginSuccess
        }
        onSwitchToSignup={() =>
          setPage("signup")
        }
      />
    );
  }

  if (page === "signup") {
    return (
      <SignupPage
        onSignupSuccess={
          handleLoginSuccess
        }
        onSwitchToLogin={() =>
          setPage("login")
        }
      />
    );
  }

  if (page === "admin") {
    return (
      <AdminDashboard
        currentAdmin={authUser}
        onBack={() =>
          setPage("app")
        }
        onLogout={handleLogout}
      />
    );
  }

  // ---------- FILTER / SEARCH / SORT ----------

  let visibleTasks =
    tasks.filter(
      (task) =>
        task.projectId ===
        activeProjectId
    );

  if (activeCategory !== "All") {
    visibleTasks =
      visibleTasks.filter(
        (task) =>
          task.category ===
          activeCategory
      );
  }

  if (searchText.trim() !== "") {
    visibleTasks =
      visibleTasks.filter(
        (task) =>
          task.text
            .toLowerCase()
            .includes(
              searchText
                .toLowerCase()
            )
      );
  }

  visibleTasks =
    [...visibleTasks].sort(
      (a, b) => {
        if (sortBy === "az") {
          return a.text.localeCompare(
            b.text
          );
        }

        return (
          (b.createdAt || 0) -
          (a.createdAt || 0)
        );
      }
    );

  const activeProject =
    projects.find(
      (project) =>
        project.id ===
        activeProjectId
    );

  const projectTasks =
    tasks.filter(
      (task) =>
        task.projectId ===
        activeProjectId
    );

  const completedCount =
    projectTasks.filter(
      (task) =>
        task.status === "Done"
    ).length;

  const activeDetailTask =
    tasks.find(
      (task) =>
        task.id ===
        activeDetailTaskId
    ) || null;

  const role =
    getCurrentUserRole();

  // ---------- UI ----------

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

              <span className="text-slate-400">
                Logged in as
              </span>

              <strong className="text-blue-600">
                {authUser?.name ||
                  authUser?.email ||
                  "User"}
              </strong>

              <button
                onClick={
                  handleLogout
                }
                className="ml-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 text-xs font-semibold transition"
              >
                Log Out
              </button>
            </div>

            {role === "admin" && (
              <button
                onClick={() =>
                  setPage("admin")
                }
                className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:border-blue-400 transition"
              >
                Admin Dashboard
              </button>
            )}
          </div>
        </header>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
            {message}
          </div>
        )}

        {loadingData && (
          <div className="mb-4 text-sm text-slate-500">
            Loading your projects and tasks...
          </div>
        )}

        <ProjectSwitcher
          projects={projects}
          activeProjectId={
            activeProjectId
          }
          onSelectProject={
            setActiveProjectId
          }
          onCreateProject={
            handleCreateProject
          }
        />

        {activeProject && (
          <p className="text-slate-500 text-sm mb-4">
            <strong className="text-slate-800">
              {activeProject.name}
            </strong>{" "}
            — {completedCount} of{" "}
            {projectTasks.length}{" "}
            tasks done
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">

          <input
            type="text"
            value={newTaskText}
            onChange={(e) =>
              setNewTaskText(
                e.target.value
              )
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              handleAddTask()
            }
            placeholder="New task..."
            className="flex-1 min-w-[150px] h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={
              newTaskCategory
            }
            onChange={(e) =>
              setNewTaskCategory(
                e.target.value
              )
            }
            className="h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
          >
            <option value="Work">
              Work
            </option>
            <option value="Personal">
              Personal
            </option>
            <option value="Urgent">
              Urgent
            </option>
          </select>

          <select
            value={newTaskStatus}
            onChange={(e) =>
              setNewTaskStatus(
                e.target.value
              )
            }
            className="h-11 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
          >
            <option value="To Do">
              To Do
            </option>
            <option value="In Progress">
              In Progress
            </option>
            <option value="In Review">
              In Review
            </option>
            <option value="Done">
              Done
            </option>
          </select>

          <button
            onClick={
              handleAddTask
            }
            disabled={actionLoading}
            className="h-11 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-sm transition"
          >
            {actionLoading
              ? "Saving..."
              : "Add Task"}
          </button>

          <button
            onClick={
              handleAIAddTask
            }
            disabled={actionLoading}
            className="h-11 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold text-sm transition"
          >
            AI Add
          </button>
        </div>

        <Controls
          searchText={
            searchText
          }
          onSearchChange={
            setSearchText
          }
          activeCategory={
            activeCategory
          }
          onCategoryChange={
            setActiveCategory
          }
          sortBy={sortBy}
          onSortChange={
            setSortBy
          }
          currentView={
            currentView
          }
          onViewChange={
            setCurrentView
          }
        />

        {currentView === "list" ? (
          <TaskList
            tasks={
              visibleTasks
            }
            onOpenTask={
              setActiveDetailTaskId
            }
            onDeleteTask={
              handleDeleteTask
            }
            onStatusChange={
              handleStatusChange
            }
            onReorder={
              handleReorder
            }
          />
        ) : (
          <Board
            tasks={
              visibleTasks
            }
            onOpenTask={
              setActiveDetailTaskId
            }
            onStatusChange={
              handleStatusChange
            }
          />
        )}

        <div className="mt-6 flex gap-2">

          <button
            onClick={
              handleExport
            }
            className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:border-blue-400 transition"
          >
            Export JSON
          </button>

          <label className="h-10 px-4 flex items-center rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:border-blue-400 transition cursor-pointer">
            Import JSON

            <input
              type="file"
              accept=".json"
              onChange={
                handleImport
              }
              hidden
            />
          </label>
        </div>

        <TaskDetailDialog
          task={
            activeDetailTask
          }
          onClose={() =>
            setActiveDetailTaskId(
              null
            )
          }
          onUpdateField={
            handleUpdateField
          }
          onAddSubtask={
            handleAddSubtask
          }
          onToggleSubtask={
            handleToggleSubtask
          }
          onDeleteSubtask={
            handleDeleteSubtask
          }
        />

        {undoData && (
          <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-4">

            <span className="text-sm">
              Task deleted
            </span>

            <button
              onClick={
                handleUndo
              }
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