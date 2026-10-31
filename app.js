import {
    loadTasks,
    saveTasks,
    loadProjects,
    saveProjects
} from "./storage.js";

import {
    renderTasks,
    renderProjects,
    renderBoard,
    renderTaskDetail,
    renderSubtasks,
    renderProgress
} from "./render.js";


/* =========================
   STATE
========================= */

let tasks = loadTasks();
let projects = loadProjects();

let activeProjectId = null;
let activeCategory = "All";
let searchText = "";
let currentView = "list";
let draggedTaskId = null;
let activeDetailTaskId = null;


/* =========================
   PROJECT MIGRATION
========================= */

if (projects.length === 0) {

    const defaultProject = {
        id: crypto.randomUUID(),
        name: "My Project"
    };

    projects.push(defaultProject);

    saveProjects(projects);
}

activeProjectId = projects[0].id;


/* =========================
   MIGRATE OLD TASKS
========================= */

let tasksChanged = false;

tasks = tasks.map(task => {

    const updatedTask = {
        ...task
    };


    if (!updatedTask.projectId) {

        updatedTask.projectId =
            activeProjectId;

        tasksChanged = true;
    }


    if (!updatedTask.status) {

        updatedTask.status =
            updatedTask.done
                ? "Done"
                : "To Do";

        tasksChanged = true;
    }


    if (!updatedTask.description) {
        updatedTask.description = "";
    }


    if (!updatedTask.dueDate) {
        updatedTask.dueDate = "";
    }


    if (!updatedTask.priority) {
        updatedTask.priority = "Normal";
    }


    if (!updatedTask.notes) {
        updatedTask.notes = "";
    }


    if (!Array.isArray(updatedTask.subtasks)) {

        updatedTask.subtasks = [];
    }


    /*
       Make sure every subtask uses
       the same "done" property.
    */

    updatedTask.subtasks =
        updatedTask.subtasks.map(
            subtask => ({

                id:
                    subtask.id ||
                    crypto.randomUUID(),

                text:
                    subtask.text || "",

                done:
                    Boolean(
                        subtask.done ??
                        subtask.completed
                    )
            })
        );


    return updatedTask;
});


if (tasksChanged) {
    saveTasks(tasks);
}


/* =========================
   DOM ELEMENTS
========================= */

const taskInput =
    document.getElementById("taskInput");

const categorySelect =
    document.getElementById("categorySelect");

const statusSelect =
    document.getElementById("statusSelect");

const addTaskBtn =
    document.getElementById("addTaskBtn");

const searchInput =
    document.getElementById("searchInput");

const sortSelect =
    document.getElementById("sortSelect");

const filterButtons =
    document.querySelectorAll(
        "#categoryFilters button"
    );

const taskList =
    document.getElementById("taskList");

const exportBtn =
    document.getElementById("exportBtn");

const importInput =
    document.getElementById("importInput");

const undoToast =
    document.getElementById("undoToast");

const undoBtn =
    document.getElementById("undoBtn");


/* =========================
   PROJECT ELEMENTS
========================= */

const projectSwitcher =
    document.getElementById(
        "projectSwitcher"
    );

const newProjectBtn =
    document.getElementById(
        "newProjectBtn"
    );

const newProjectDialog =
    document.getElementById(
        "newProjectDialog"
    );

const projectNameInput =
    document.getElementById(
        "projectNameInput"
    );

const createProjectBtn =
    document.getElementById(
        "createProjectBtn"
    );

const cancelProjectBtn =
    document.getElementById(
        "cancelProjectBtn"
    );

const closeProjectDialogBtn =
    document.getElementById(
        "closeProjectDialogBtn"
    );


/* =========================
   VIEW ELEMENTS
========================= */

const listViewBtn =
    document.getElementById(
        "listViewBtn"
    );

const boardViewBtn =
    document.getElementById(
        "boardViewBtn"
    );

const listView =
    document.getElementById(
        "listView"
    );

const boardView =
    document.getElementById(
        "boardView"
    );


/* =========================
   DETAIL ELEMENTS
========================= */

const taskDetailDialog =
    document.getElementById(
        "taskDetailDialog"
    );

const detailTaskTitle =
    document.getElementById(
        "detailTaskTitle"
    );

const closeDetailBtn =
    document.getElementById(
        "closeDetailBtn"
    );

const detailDescription =
    document.getElementById(
        "detailDescription"
    );

let detailStatus =
    document.getElementById(
        "detailStatus"
    );

let detailPriority =
    document.getElementById(
        "detailPriority"
    );

const detailDueDate =
    document.getElementById(
        "detailDueDate"
    );

let detailCategory =
    document.getElementById(
        "detailCategory"
    );

const taskNotes =
    document.getElementById(
        "taskNotes"
    );

const saveNotesBtn =
    document.getElementById(
        "saveNotesBtn"
    );

const subtaskInput =
    document.getElementById(
        "subtaskInput"
    );

const addSubtaskBtn =
    document.getElementById(
        "addSubtaskBtn"
    );

const subtaskList =
    document.getElementById(
        "subtaskList"
    );


/* =========================
   MAKE DETAIL CONTROLS
   CLICKABLE
========================= */

/*
   If detailStatus / priority / category
   are normal text elements instead of
   <select>, convert them into dropdowns.
*/

function ensureSelect(
    element,
    options,
    defaultValue
) {

    if (!element) {
        return null;
    }


    if (
        element.tagName.toLowerCase() ===
        "select"
    ) {

        return element;
    }


    const select =
        document.createElement("select");


    select.id =
        element.id;


    select.className =
        element.className;


    options.forEach(optionValue => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            optionValue;

        option.textContent =
            optionValue;

        select.appendChild(
            option
        );

    });


    select.value =
        defaultValue;


    element.replaceWith(select);


    return select;
}


/* STATUS */

detailStatus =
    ensureSelect(
        detailStatus,
        [
            "To Do",
            "In Progress",
            "In Review",
            "Done"
        ],
        "To Do"
    );


/* PRIORITY */

detailPriority =
    ensureSelect(
        detailPriority,
        [
            "Low",
            "Normal",
            "High"
        ],
        "Normal"
    );


/* CATEGORY */

detailCategory =
    ensureSelect(
        detailCategory,
        [
            "Work",
            "Personal",
            "Urgent"
        ],
        "Work"
    );


/* =========================
   INITIAL UI
========================= */

updateUI();


/* =========================
   ADD TASK
========================= */

function addTask(
    text,
    category,
    status
) {

    const newTask = {

        id:
            crypto.randomUUID(),

        projectId:
            activeProjectId,

        text:
            text,

        category:
            category,

        status:
            status,

        done:
            status === "Done",

        description:
            "",

        dueDate:
            "",

        priority:
            "Normal",

        notes:
            "",

        subtasks:
            [],

        createdAt:
            Date.now()
    };


    tasks.push(newTask);

    saveTasks(tasks);

    updateUI();

    taskInput.value = "";

    taskInput.focus();
}


/* =========================
   ADD TASK BUTTON
========================= */

addTaskBtn.addEventListener(
    "click",
    () => {

        const text =
            taskInput.value.trim();

        const category =
            categorySelect.value;

        const status =
            statusSelect.value;


        if (text === "") {

            taskInput.focus();

            return;
        }


        addTask(
            text,
            category,
            status
        );
    }
);


/* =========================
   ENTER KEY - ADD TASK
========================= */

taskInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            addTaskBtn.click();
        }
    }
);


/* =========================
   PROJECT SWITCHING
========================= */

projectSwitcher.addEventListener(
    "click",
    event => {

        const projectButton =
            event.target.closest(
                ".project-item"
            );


        if (!projectButton) {
            return;
        }


        activeProjectId =
            projectButton.dataset.projectId;


        activeCategory =
            "All";


        filterButtons.forEach(
            button => {

                button.classList.remove(
                    "active"
                );


                if (
                    button.dataset.category ===
                    "All"
                ) {

                    button.classList.add(
                        "active"
                    );
                }

            }
        );


        searchInput.value = "";

        searchText = "";


        updateUI();
    }
);


/* =========================
   NEW PROJECT DIALOG
========================= */

newProjectBtn.addEventListener(
    "click",
    () => {

        projectNameInput.value = "";

        newProjectDialog.showModal();

        projectNameInput.focus();
    }
);


/* =========================
   CREATE PROJECT
========================= */

createProjectBtn.addEventListener(
    "click",
    () => {

        const name =
            projectNameInput.value.trim();


        if (name === "") {

            projectNameInput.focus();

            return;
        }


        const newProject = {

            id:
                crypto.randomUUID(),

            name:
                name
        };


        projects.push(newProject);

        saveProjects(projects);


        activeProjectId =
            newProject.id;


        newProjectDialog.close();

        updateUI();
    }
);


/* =========================
   CREATE PROJECT ENTER
========================= */

projectNameInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            createProjectBtn.click();
        }
    }
);


/* =========================
   CANCEL PROJECT
========================= */

cancelProjectBtn.addEventListener(
    "click",
    () => {

        newProjectDialog.close();
    }
);


/* =========================
   CLOSE PROJECT DIALOG
========================= */

closeProjectDialogBtn.addEventListener(
    "click",
    () => {

        newProjectDialog.close();
    }
);


/* =========================
   CATEGORY FILTER
========================= */

filterButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                activeCategory =
                    button.dataset.category;


                filterButtons.forEach(
                    btn => {

                        btn.classList.remove(
                            "active"
                        );
                    }
                );


                button.classList.add(
                    "active"
                );


                updateUI();
            }
        );
    }
);


/* =========================
   LIVE SEARCH
========================= */

searchInput.addEventListener(
    "input",
    () => {

        searchText =
            searchInput.value
                .toLowerCase()
                .trim();


        updateUI();
    }
);


/* =========================
   SORT
========================= */

sortSelect.addEventListener(
    "change",
    () => {

        updateUI();
    }
);


/* =========================
   VIEW TOGGLE
========================= */

listViewBtn.addEventListener(
    "click",
    () => {

        currentView = "list";

        updateViewButtons();

        updateUI();
    }
);


boardViewBtn.addEventListener(
    "click",
    () => {

        currentView = "board";

        updateViewButtons();

        updateUI();
    }
);


function updateViewButtons() {

    listViewBtn.classList.toggle(
        "active",
        currentView === "list"
    );


    boardViewBtn.classList.toggle(
        "active",
        currentView === "board"
    );


    listView.hidden =
        currentView !== "list";


    boardView.hidden =
        currentView !== "board";
}


/* =========================
   GET PROJECT TASKS
========================= */

function getProjectTasks() {

    return tasks.filter(
        task =>
            task.projectId ===
            activeProjectId
    );
}


/* =========================
   GET VISIBLE TASKS
========================= */

function getVisibleTasks() {

    let visibleTasks =
        getProjectTasks();


    /* CATEGORY FILTER */

    if (
        activeCategory !== "All"
    ) {

        visibleTasks =
            visibleTasks.filter(
                task =>
                    task.category ===
                    activeCategory
            );
    }


    /* SEARCH */

    if (searchText !== "") {

        visibleTasks =
            visibleTasks.filter(
                task =>
                    String(
                        task.text || ""
                    )
                    .toLowerCase()
                    .includes(searchText)
            );
    }


    /* SORT */

    if (
        sortSelect.value === "az"
    ) {

        visibleTasks.sort(
            (a, b) =>
                String(a.text || "")
                    .localeCompare(
                        String(b.text || "")
                    )
        );

    } else {

        visibleTasks.sort(
            (a, b) =>
                (b.createdAt || 0) -
                (a.createdAt || 0)
        );
    }


    return visibleTasks;
}


/* =========================
   UPDATE UI
========================= */

function updateUI() {

    const visibleTasks =
        getVisibleTasks();


    const projectTasks =
        getProjectTasks();


    const activeProject =
        projects.find(
            project =>
                project.id ===
                activeProjectId
        );


    /* PROJECTS */

    renderProjects(
        projects,
        activeProjectId
    );


    /* LIST */

    renderTasks(
        visibleTasks
    );


    /* BOARD */

    renderBoard(
        visibleTasks
    );


    /* PROGRESS */

    if (activeProject) {

        renderProgress(
            activeProject,
            projectTasks
        );
    }


    /* VIEW */

    updateViewButtons();


    /* DRAG & DROP */

    if (
        currentView === "list"
    ) {

        setupListDragAndDrop();

    } else {

        setupBoardDragAndDrop();
    }
}


/* =========================
   LIST DRAG & DROP
========================= */

function setupListDragAndDrop() {

    const taskItems =
        document.querySelectorAll(
            ".task-item"
        );


    taskItems.forEach(
        item => {

            item.addEventListener(
                "dragstart",
                event => {

                    draggedTaskId =
                        item.dataset.id ||
                        item.dataset.taskId;


                    item.classList.add(
                        "dragging"
                    );


                    event.dataTransfer.effectAllowed =
                        "move";


                    event.dataTransfer.setData(
                        "text/plain",
                        draggedTaskId
                    );
                }
            );


            item.addEventListener(
                "dragend",
                () => {

                    item.classList.remove(
                        "dragging"
                    );


                    draggedTaskId = null;
                }
            );
        }
    );


    taskList.addEventListener(
        "dragover",
        handleListDragOver
    );


    taskList.addEventListener(
        "drop",
        handleListDrop
    );
}


function handleListDragOver(event) {

    event.preventDefault();


    const draggingItem =
        document.querySelector(
            ".task-item.dragging"
        );


    if (!draggingItem) {
        return;
    }


    const taskItems = [
        ...taskList.querySelectorAll(
            ".task-item:not(.dragging)"
        )
    ];


    let closestItem = null;

    let closestOffset =
        Number.NEGATIVE_INFINITY;


    for (
        const item of taskItems
    ) {

        const box =
            item.getBoundingClientRect();


        const offset =
            event.clientY -
            box.top -
            box.height / 2;


        if (
            offset < 0 &&
            offset > closestOffset
        ) {

            closestOffset =
                offset;

            closestItem =
                item;
        }
    }


    if (closestItem) {

        taskList.insertBefore(
            draggingItem,
            closestItem
        );

    } else {

        taskList.appendChild(
            draggingItem
        );
    }
}


function handleListDrop(event) {

    event.preventDefault();


    const orderedIds = [
        ...taskList.querySelectorAll(
            ".task-item"
        )
    ].map(
        item =>
            item.dataset.id ||
            item.dataset.taskId
    );


    const visibleSet =
        new Set(orderedIds);


    const projectTasks =
        tasks.filter(
            task =>
                task.projectId ===
                activeProjectId
        );


    const reorderedProjectTasks =
        [];


    orderedIds.forEach(id => {

        const task =
            projectTasks.find(
                item =>
                    item.id === id
            );


        if (task) {

            reorderedProjectTasks.push(
                task
            );
        }
    });


    projectTasks.forEach(
        task => {

            if (
                !visibleSet.has(
                    task.id
                )
            ) {

                reorderedProjectTasks.push(
                    task
                );
            }
        }
    );


    const otherTasks =
        tasks.filter(
            task =>
                task.projectId !==
                activeProjectId
        );


    tasks = [
        ...otherTasks,
        ...reorderedProjectTasks
    ];


    saveTasks(tasks);

    draggedTaskId = null;

    updateUI();
}


/* =========================
   BOARD DRAG & DROP
========================= */

function setupBoardDragAndDrop() {

    const boardTasks =
        document.querySelectorAll(
            ".kanban-task"
        );


    const columns =
        document.querySelectorAll(
            ".kanban-tasks"
        );


    boardTasks.forEach(
        card => {

            card.addEventListener(
                "dragstart",
                event => {

                    draggedTaskId =
                        card.dataset.taskId ||
                        card.dataset.id;


                    card.classList.add(
                        "dragging"
                    );


                    event.dataTransfer.effectAllowed =
                        "move";


                    event.dataTransfer.setData(
                        "text/plain",
                        draggedTaskId
                    );
                }
            );


            card.addEventListener(
                "dragend",
                () => {

                    card.classList.remove(
                        "dragging"
                    );


                    draggedTaskId = null;
                }
            );
        }
    );


    columns.forEach(
        column => {

            column.addEventListener(
                "dragover",
                event => {

                    event.preventDefault();

                    column.classList.add(
                        "drag-over"
                    );
                }
            );


            column.addEventListener(
                "dragleave",
                () => {

                    column.classList.remove(
                        "drag-over"
                    );
                }
            );


            column.addEventListener(
                "drop",
                event => {

                    event.preventDefault();


                    column.classList.remove(
                        "drag-over"
                    );


                    const taskId =
                        draggedTaskId ||
                        event.dataTransfer.getData(
                            "text/plain"
                        );


                    if (!taskId) {
                        return;
                    }


                    const task =
                        tasks.find(
                            item =>
                                item.id ===
                                taskId
                        );


                    if (!task) {
                        return;
                    }


                    let newStatus =
                        "To Do";


                    if (
                        column.id ===
                        "inProgressColumn"
                    ) {

                        newStatus =
                            "In Progress";

                    } else if (
                        column.id ===
                        "inReviewColumn"
                    ) {

                        newStatus =
                            "In Review";

                    } else if (
                        column.id ===
                        "doneColumn"
                    ) {

                        newStatus =
                            "Done";
                    }


                    task.status =
                        newStatus;


                    task.done =
                        newStatus ===
                        "Done";


                    saveTasks(tasks);

                    draggedTaskId = null;

                    updateUI();
                }
            );
        }
    );
}


/* =========================
   OPEN TASK DETAIL
========================= */

document.addEventListener(
    "click",
    event => {

        const taskCard =
            event.target.closest(
                ".task-item, .kanban-task"
            );


        if (!taskCard) {
            return;
        }


        if (
            event.target.closest(
                ".delete-btn"
            )
        ) {
            return;
        }


        const taskId =
            taskCard.dataset.id ||
            taskCard.dataset.taskId;


        if (!taskId) {
            return;
        }


        openTaskDetail(taskId);
    }
);


/* =========================
   OPEN DETAIL
========================= */

function openTaskDetail(taskId) {

    const task =
        tasks.find(
            item =>
                item.id === taskId
        );


    if (!task) {
        return;
    }


    activeDetailTaskId =
        taskId;


    renderTaskDetail(task);


    renderSubtasks(
        task.subtasks || []
    );


    taskDetailDialog.showModal();
}


/* =========================
   CLOSE DETAIL
========================= */

closeDetailBtn.addEventListener(
    "click",
    () => {

        taskDetailDialog.close();

        activeDetailTaskId = null;
    }
);


/* =========================
   SAVE DETAIL CHANGES
========================= */

function saveDetailChanges() {

    if (!activeDetailTaskId) {
        return;
    }


    const task =
        tasks.find(
            item =>
                item.id ===
                activeDetailTaskId
        );


    if (!task) {
        return;
    }


    /* DESCRIPTION */

    if (detailDescription) {

        task.description =
            detailDescription.value ??
            "";
    }


    /* STATUS */

    if (detailStatus) {

        task.status =
            detailStatus.value;

        task.done =
            task.status === "Done";
    }


    /* PRIORITY */

    if (detailPriority) {

        task.priority =
            detailPriority.value;
    }


    /* DUE DATE */

    if (detailDueDate) {

        task.dueDate =
            detailDueDate.value;
    }


    /* CATEGORY */

    if (detailCategory) {

        task.category =
            detailCategory.value;
    }


    /* NOTES */

    if (taskNotes) {

        task.notes =
            taskNotes.value;
    }


    saveTasks(tasks);

    updateUI();


    /*
       Re-render the open dialog
       so the selected status stays visible.
    */

    if (
        taskDetailDialog.open &&
        activeDetailTaskId
    ) {

        renderTaskDetail(task);

        renderSubtasks(
            task.subtasks || []
        );
    }
}


/* =========================
   DETAIL STATUS CHANGE
========================= */

detailStatus.addEventListener(
    "change",
    saveDetailChanges
);


/* =========================
   DETAIL PRIORITY CHANGE
========================= */

detailPriority.addEventListener(
    "change",
    saveDetailChanges
);


/* =========================
   DETAIL DUE DATE CHANGE
========================= */

detailDueDate.addEventListener(
    "change",
    saveDetailChanges
);


/* =========================
   DETAIL CATEGORY CHANGE
========================= */

detailCategory.addEventListener(
    "change",
    saveDetailChanges
);


/* =========================
   DETAIL DESCRIPTION CHANGE
========================= */

detailDescription.addEventListener(
    "change",
    saveDetailChanges
);


/* =========================
   SAVE NOTES
========================= */

saveNotesBtn.addEventListener(
    "click",
    () => {

        if (!activeDetailTaskId) {
            return;
        }


        const task =
            tasks.find(
                item =>
                    item.id ===
                    activeDetailTaskId
            );


        if (!task) {
            return;
        }


        task.notes =
            taskNotes.value;


        saveTasks(tasks);

        updateUI();


        /*
           Keep detail dialog open
           after saving notes.
        */

        if (
            taskDetailDialog.open
        ) {

            renderTaskDetail(task);

            renderSubtasks(
                task.subtasks || []
            );
        }
    }
);


/* =========================
   ADD SUBTASK
========================= */

addSubtaskBtn.addEventListener(
    "click",
    addSubtask
);


subtaskInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            addSubtask();
        }
    }
);


function addSubtask() {

    if (!activeDetailTaskId) {
        return;
    }


    const text =
        subtaskInput.value.trim();


    if (text === "") {
        return;
    }


    const task =
        tasks.find(
            item =>
                item.id ===
                activeDetailTaskId
        );


    if (!task) {
        return;
    }


    if (!Array.isArray(task.subtasks)) {

        task.subtasks = [];
    }


    task.subtasks.push({

        id:
            crypto.randomUUID(),

        text:
            text,

        done:
            false
    });


    saveTasks(tasks);


    subtaskInput.value = "";


    renderSubtasks(
        task.subtasks
    );
}


/* =========================
   SUBTASK CHECK / DELETE
========================= */

subtaskList.addEventListener(
    "click",
    event => {

        if (!activeDetailTaskId) {
            return;
        }


        const task =
            tasks.find(
                item =>
                    item.id ===
                    activeDetailTaskId
            );


        if (!task) {
            return;
        }


        const checkbox =
            event.target.closest(
                ".subtask-checkbox"
            );


        const deleteButton =
            event.target.closest(
                ".subtask-delete"
            );


        /* CHECK SUBTASK */

        if (checkbox) {

            const subtaskId =
                checkbox.dataset.subtaskId;


            const subtask =
                task.subtasks.find(
                    item =>
                        item.id ===
                        subtaskId
                );


            if (subtask) {

                subtask.done =
                    checkbox.checked;
            }


            saveTasks(tasks);


            renderSubtasks(
                task.subtasks
            );


            return;
        }


        /* DELETE SUBTASK */

        if (deleteButton) {

            const subtaskId =
                deleteButton.dataset.subtaskId;


            task.subtasks =
                task.subtasks.filter(
                    item =>
                        item.id !==
                        subtaskId
                );


            saveTasks(tasks);


            renderSubtasks(
                task.subtasks
            );
        }
    }
);


/* =========================
   DELETE TASK
========================= */

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.classList.contains(
                "delete-btn"
            )
        ) {
            return;
        }


        const taskCard =
            event.target.closest(
                ".task-item, .kanban-task"
            );


        if (!taskCard) {
            return;
        }


        const taskId =
            taskCard.dataset.id ||
            taskCard.dataset.taskId;


        deleteTask(taskId);
    }
);


/* =========================
   DELETE FUNCTION
========================= */

function deleteTask(taskId) {

    const originalIndex =
        tasks.findIndex(
            task =>
                task.id === taskId
        );


    if (originalIndex === -1) {
        return;
    }


    const removedTask =
        tasks[originalIndex];


    tasks =
        tasks.filter(
            task =>
                task.id !== taskId
        );


    saveTasks(tasks);

    updateUI();


    showUndoToast(
        removedTask,
        originalIndex
    );
}


/* =========================
   UNDO
========================= */

function showUndoToast(
    removedTask,
    originalIndex
) {

    let undoUsed = false;


    undoToast.hidden = false;


    const timeoutId =
        setTimeout(
            () => {

                undoToast.hidden = true;

            },
            5000
        );


    function undoDelete() {

        if (undoUsed) {
            return;
        }


        undoUsed = true;


        clearTimeout(
            timeoutId
        );


        tasks.splice(
            originalIndex,
            0,
            removedTask
        );


        saveTasks(tasks);

        updateUI();

        undoToast.hidden = true;
    }


    undoBtn.onclick =
        undoDelete;
}


/* =========================
   EXPORT
========================= */

exportBtn.addEventListener(
    "click",
    () => {

        const data = {

            projects:
                projects,

            tasks:
                tasks
        };


        const json =
            JSON.stringify(
                data,
                null,
                2
            );


        const blob =
            new Blob(
                [json],
                {
                    type:
                        "application/json"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            "tasks.json";


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );
    }
);


/* =========================
   IMPORT
========================= */

importInput.addEventListener(
    "change",
    event => {

        const file =
            event.target.files[0];


        if (!file) {
            return;
        }


        const reader =
            new FileReader();


        reader.onload =
            event => {

                try {

                    const importedData =
                        JSON.parse(
                            event.target.result
                        );


                    /* WEEK 3 FORMAT */

                    if (
                        importedData &&
                        !Array.isArray(
                            importedData
                        ) &&
                        Array.isArray(
                            importedData.projects
                        ) &&
                        Array.isArray(
                            importedData.tasks
                        )
                    ) {

                        projects =
                            importedData.projects;


                        tasks =
                            importedData.tasks;


                        if (
                            projects.length ===
                            0
                        ) {

                            projects.push({

                                id:
                                    crypto.randomUUID(),

                                name:
                                    "My Project"
                            });
                        }


                        activeProjectId =
                            projects[0].id;
                    }


                    /* WEEK 2 FORMAT */

                    else if (
                        Array.isArray(
                            importedData
                        )
                    ) {

                        if (
                            projects.length ===
                            0
                        ) {

                            projects.push({

                                id:
                                    crypto.randomUUID(),

                                name:
                                    "My Project"
                            });


                            saveProjects(
                                projects
                            );
                        }


                        activeProjectId =
                            projects[0].id;


                        tasks =
                            importedData;
                    }


                    else {

                        throw new Error(
                            "Invalid task data"
                        );
                    }


                    /* NORMALIZE TASKS */

                    tasks =
                        tasks
                            .filter(
                                task =>
                                    task &&
                                    typeof task.text ===
                                        "string"
                            )
                            .map(
                                task => ({

                                    id:
                                        task.id ||
                                        crypto.randomUUID(),

                                    projectId:
                                        task.projectId ||
                                        activeProjectId,

                                    text:
                                        task.text,

                                    category:
                                        task.category ||
                                        "Work",

                                    status:
                                        task.status ||
                                        (
                                            task.done
                                                ? "Done"
                                                : "To Do"
                                        ),

                                    done:
                                        task.status ===
                                            "Done" ||
                                        Boolean(
                                            task.done
                                        ),

                                    description:
                                        task.description ||
                                        "",

                                    dueDate:
                                        task.dueDate ||
                                        "",

                                    priority:
                                        task.priority ||
                                        "Normal",

                                    notes:
                                        task.notes ||
                                        "",

                                    subtasks:
                                        Array.isArray(
                                            task.subtasks
                                        )
                                            ? task.subtasks.map(
                                                subtask => ({

                                                    id:
                                                        subtask.id ||
                                                        crypto.randomUUID(),

                                                    text:
                                                        subtask.text ||
                                                        "",

                                                    done:
                                                        Boolean(
                                                            subtask.done ??
                                                            subtask.completed
                                                        )
                                                })
                                            )
                                            : [],

                                    createdAt:
                                        task.createdAt ||
                                        Date.now()
                                })
                            );


                    saveProjects(projects);

                    saveTasks(tasks);

                    updateUI();

                    importInput.value = "";


                } catch (error) {

                    console.error(
                        error
                    );


                    alert(
                        "Invalid JSON file. Please import a valid tasks.json file."
                    );
                }
            };


        reader.readAsText(file);
    }
);


/* =========================
   KEYBOARD SHORTCUTS
========================= */

document.addEventListener(
    "keydown",
    event => {

        const activeElement =
            document.activeElement;


        const isTyping =
            activeElement &&
            (
                activeElement.tagName ===
                    "INPUT" ||
                activeElement.tagName ===
                    "TEXTAREA" ||
                activeElement.tagName ===
                    "SELECT"
            );


        /* N → NEW TASK */

        if (
            event.key.toLowerCase() ===
                "n" &&
            !isTyping
        ) {

            event.preventDefault();

            taskInput.focus();
        }


        /* ESCAPE → CLEAR SEARCH */

        if (
            event.key === "Escape" &&
            !taskDetailDialog.open &&
            !newProjectDialog.open
        ) {

            searchInput.value = "";

            searchText = "";

            updateUI();
        }
    }
);
