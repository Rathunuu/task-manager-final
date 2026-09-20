import { getCurrentUser } from "./auth";


/* =========================
   PER-USER STORAGE KEYS
========================= */

function tasksKeyFor(username) {

    return `task-manager-tasks-${username || "guest"}`;
}


function projectsKeyFor(username) {

    return `task-manager-projects-${username || "guest"}`;
}


/* =========================
   TASK STORAGE (any user)

   Used by the Admin Dashboard to
   read/write a specific user's
   tasks, and internally by the
   current-user helpers below.
========================= */

export function loadTasksForUser(username) {

    const storedTasks =
        localStorage.getItem(
            tasksKeyFor(username)
        );

    if (!storedTasks) {
        return [];
    }

    try {

        const tasks =
            JSON.parse(storedTasks);

        return Array.isArray(tasks)
            ? tasks
            : [];

    } catch (error) {

        console.error(
            "Could not load tasks:",
            error
        );

        return [];
    }
}


export function saveTasksForUser(
    username,
    tasks
) {

    localStorage.setItem(
        tasksKeyFor(username),
        JSON.stringify(tasks)
    );
}


/* =========================
   PROJECT STORAGE (any user)
========================= */

export function loadProjectsForUser(username) {

    const storedProjects =
        localStorage.getItem(
            projectsKeyFor(username)
        );

    if (!storedProjects) {
        return [];
    }

    try {

        const projects =
            JSON.parse(storedProjects);

        return Array.isArray(projects)
            ? projects
            : [];

    } catch (error) {

        console.error(
            "Could not load projects:",
            error
        );

        return [];
    }
}


export function saveProjectsForUser(
    username,
    projects
) {

    localStorage.setItem(
        projectsKeyFor(username),
        JSON.stringify(projects)
    );
}


/* =========================
   CURRENT-USER SHORTCUTS

   App.jsx keeps calling these
   exactly as before - they just
   forward to the "ForUser" versions
   using whoever is logged in.
========================= */

export function loadTasks() {

    return loadTasksForUser(
        getCurrentUser()
    );
}


export function saveTasks(tasks) {

    saveTasksForUser(
        getCurrentUser(),
        tasks
    );
}


export function loadProjects() {

    return loadProjectsForUser(
        getCurrentUser()
    );
}


export function saveProjects(projects) {

    saveProjectsForUser(
        getCurrentUser(),
        projects
    );
}