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
    if (status === "in-review") return "In Review";
    if (status === "in-progress") return "In Progress";
    return "To Do";
  }

  function convertStatusToBackend(status) {
    if (status === "Done") return "completed";
    if (status === "In Review") return "in-review";
    if (status === "In Progress") return "in-progress";
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
