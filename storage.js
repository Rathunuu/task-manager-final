const TASKS_KEY = "task-manager-tasks";
const PROJECTS_KEY = "task-manager-projects";


/* =========================
   TASK STORAGE
========================= */

export function loadTasks() {

    const storedTasks =
        localStorage.getItem(TASKS_KEY);

    if (!storedTasks) {
        return [];
    }

    try {

        const tasks =
            JSON.parse(storedTasks);

        if (!Array.isArray(tasks)) {
            return [];
        }

        return tasks;

    } catch (error) {

        console.error(
            "Could not load tasks:",
            error
        );

        return [];

    }
}


export function saveTasks(tasks) {

    localStorage.setItem(
        TASKS_KEY,
        JSON.stringify(tasks)
    );

}


/* =========================
   PROJECT STORAGE
========================= */

export function loadProjects() {

    const storedProjects =
        localStorage.getItem(PROJECTS_KEY);

    if (!storedProjects) {
        return [];
    }

    try {

        const projects =
            JSON.parse(storedProjects);

        if (!Array.isArray(projects)) {
            return [];
        }

        return projects;

    } catch (error) {

        console.error(
            "Could not load projects:",
            error
        );

        return [];

    }
}


export function saveProjects(projects) {

    localStorage.setItem(
        PROJECTS_KEY,
        JSON.stringify(projects)
    );

}
