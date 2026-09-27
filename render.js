/* =========================
   RENDER TASKS - LIST VIEW
========================= */

export function renderTasks(tasks) {

    const taskList =
        document.getElementById("taskList");

    const emptyState =
        document.getElementById("emptyState");

    const taskCount =
        document.getElementById("taskCount");

    if (!taskList) {
        return;
    }

    taskList.innerHTML = "";

    if (taskCount) {
        taskCount.textContent =
            tasks.length;
    }

    if (tasks.length === 0) {

        if (emptyState) {
            emptyState.hidden = false;
        }

        return;
    }

    if (emptyState) {
        emptyState.hidden = true;
    }


    tasks.forEach((task, index) => {

        const li =
            document.createElement("li");

        li.className =
            "task-item";

        li.setAttribute(
            "draggable",
            "true"
        );

        li.dataset.id =
            task.id;

        li.dataset.taskId =
            task.id;

        li.dataset.index =
            index;


        const category =
            task.category || "Work";

        const categoryClass =
            String(category)
                .toLowerCase();

        const status =
            task.status || "To Do";


        li.innerHTML = `

            <div
                class="drag-handle"
                aria-hidden="true"
            >
                ⋮⋮
            </div>

            <div class="task-content">

                <strong class="task-title">
                    ${escapeHTML(
                        task.text || ""
                    )}
                </strong>

                <div class="task-meta">

                    <span
                        class="category-badge category-${escapeHTML(
                            categoryClass
                        )}"
                    >
                        ${escapeHTML(category)}
                    </span>

                    <span class="status-badge">
                        ${escapeHTML(status)}
                    </span>

                </div>

            </div>

            <button
                type="button"
                class="delete-btn"
                aria-label="Delete ${escapeHTML(
                    task.text || ""
                )}"
            >
                Delete
            </button>

        `;


        taskList.appendChild(li);

    });

}


/* =========================
   RENDER PROJECTS
========================= */

export function renderProjects(
    projects = [],
    activeProjectId
) {

    const projectSwitcher =
        document.getElementById(
            "projectSwitcher"
        );

    if (!projectSwitcher) {
        return;
    }


    projectSwitcher.innerHTML = "";


    /* =========================
       PROJECT BUTTONS
    ========================= */

    projects.forEach(project => {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "project-item";

        button.dataset.projectId =
            project.id;


        if (
            project.id ===
            activeProjectId
        ) {

            button.classList.add(
                "active"
            );
        }


        button.textContent =
            project.name;


        projectSwitcher.appendChild(
            button
        );

    });


    /* =========================
       NEW PROJECT BUTTON
    ========================= */

    const newProjectBtn =
        document.getElementById(
            "newProjectBtn"
        );


    if (newProjectBtn) {

        /*
           Move the existing button into
           the project switcher only once.
        */

        if (
            newProjectBtn.parentElement !==
            projectSwitcher
        ) {

            projectSwitcher.appendChild(
                newProjectBtn
            );

        } else {

            projectSwitcher.appendChild(
                newProjectBtn
            );
        }
    }

}


/* =========================
   RENDER KANBAN BOARD
========================= */

export function renderBoard(tasks = []) {

    const columns = {

        "To Do":
            document.getElementById(
                "todoColumn"
            ),

        "In Progress":
            document.getElementById(
                "inProgressColumn"
            ),

        "In Review":
            document.getElementById(
                "inReviewColumn"
            ),

        "Done":
            document.getElementById(
                "doneColumn"
            )

    };


    const counts = {

        "To Do":
            document.getElementById(
                "todoCount"
            ),

        "In Progress":
            document.getElementById(
                "inProgressCount"
            ),

        "In Review":
            document.getElementById(
                "inReviewCount"
            ),

        "Done":
            document.getElementById(
                "doneCount"
            )

    };


    /* =========================
       CLEAR COLUMNS
    ========================= */

    Object.values(columns).forEach(
        column => {

            if (column) {

                column.innerHTML = "";

            }

        }
    );


    /* =========================
       RESET COUNTS
    ========================= */

    Object.values(counts).forEach(
        count => {

            if (count) {

                count.textContent = "0";

            }

        }
    );


    /* =========================
       ADD TASKS TO COLUMNS
    ========================= */

    tasks.forEach(task => {

        const status =
            task.status || "To Do";


        const column =
            columns[status];


        if (!column) {
            return;
        }


        const card =
            document.createElement(
                "div"
            );


        card.className =
            "kanban-task";


        card.setAttribute(
            "draggable",
            "true"
        );


        card.dataset.taskId =
            task.id;

        card.dataset.id =
            task.id;


        const category =
            task.category || "Work";


        const categoryClass =
            String(category)
                .toLowerCase();


        card.innerHTML = `

            <div class="kanban-task-content">

                <strong class="task-title">
                    ${escapeHTML(
                        task.text || ""
                    )}
                </strong>

                <div class="task-meta">

                    <span
                        class="category-badge category-${escapeHTML(
                            categoryClass
                        )}"
                    >
                        ${escapeHTML(category)}
                    </span>

                </div>

            </div>

        `;


        column.appendChild(card);

    });


    /* =========================
       UPDATE COLUMN COUNTS
    ========================= */

    Object.keys(columns).forEach(
        status => {

            const column =
                columns[status];

            const count =
                counts[status];


            if (
                column &&
                count
            ) {

                count.textContent =
                    column.children.length;

            }

        }
    );

}


/* =========================
   RENDER TASK DETAIL
========================= */

export function renderTaskDetail(task) {

    if (!task) {
        return;
    }


    const title =
        document.getElementById(
            "detailTaskTitle"
        );

    const description =
        document.getElementById(
            "detailDescription"
        );

    const status =
        document.getElementById(
            "detailStatus"
        );

    const priority =
        document.getElementById(
            "detailPriority"
        );

    const dueDate =
        document.getElementById(
            "detailDueDate"
        );

    const category =
        document.getElementById(
            "detailCategory"
        );

    const notes =
        document.getElementById(
            "taskNotes"
        );


    /* =========================
       TITLE
    ========================= */

    if (title) {

        title.textContent =
            task.text || "";

    }


    /* =========================
       DESCRIPTION
    ========================= */

    if (description) {

        /*
           textarea/input → value
           normal text element → textContent
        */

        if (
            "value" in description
        ) {

            description.value =
                task.description || "";

        } else {

            description.textContent =
                task.description ||
                "No description";

        }

    }


    /* =========================
       STATUS
    ========================= */

    if (status) {

        status.value =
            task.status || "To Do";

    }


    /* =========================
       PRIORITY
    ========================= */

    if (priority) {

        priority.value =
            task.priority || "Normal";

    }


    /* =========================
       DUE DATE
    ========================= */

    if (dueDate) {

        dueDate.value =
            task.dueDate || "";

    }


    /* =========================
       CATEGORY
    ========================= */

    if (category) {

        /*
           If category is a select/input,
           use value.

           Otherwise use textContent.
        */

        if (
            "value" in category
        ) {

            category.value =
                task.category || "Work";

        } else {

            category.textContent =
                task.category || "Work";

        }

    }


    /* =========================
       NOTES
    ========================= */

    if (notes) {

        notes.value =
            task.notes || "";

    }

}


/* =========================
   RENDER SUBTASKS
========================= */

export function renderSubtasks(
    subtasks = []
) {

    const subtaskList =
        document.getElementById(
            "subtaskList"
        );

    if (!subtaskList) {
        return;
    }


    subtaskList.innerHTML = "";


    if (
        !Array.isArray(subtasks) ||
        subtasks.length === 0
    ) {

        const emptyMessage =
            document.createElement(
                "p"
            );

        emptyMessage.className =
            "subtask-empty";

        emptyMessage.textContent =
            "No subtasks yet.";


        subtaskList.appendChild(
            emptyMessage
        );

        return;
    }


    subtasks.forEach(
        subtask => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "subtask-item";


            /* CHECKBOX */

            const checkbox =
                document.createElement(
                    "input"
                );

            checkbox.type =
                "checkbox";

            checkbox.className =
                "subtask-checkbox";

            checkbox.dataset.subtaskId =
                subtask.id;

            checkbox.checked =
                Boolean(subtask.done);


            /* LABEL */

            const label =
                document.createElement(
                    "label"
                );

            label.textContent =
                subtask.text || "";


            if (subtask.done) {

                label.classList.add(
                    "completed"
                );

            }


            /* DELETE BUTTON */

            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.type =
                "button";

            deleteButton.className =
                "subtask-delete";

            deleteButton.dataset.subtaskId =
                subtask.id;

            deleteButton.textContent =
                "Delete";


            /* APPEND */

            item.appendChild(
                checkbox
            );

            item.appendChild(
                label
            );

            item.appendChild(
                deleteButton
            );


            subtaskList.appendChild(
                item
            );

        }
    );

}


/* =========================
   RENDER PROJECT PROGRESS
========================= */

export function renderProgress(
    project,
    projectTasks = []
) {

    const activeProjectName =
        document.getElementById(
            "activeProjectName"
        );

    const progressText =
        document.getElementById(
            "progressText"
        );

    const progressBar =
        document.getElementById(
            "progressBar"
        );

    const progressFill =
        document.getElementById(
            "progressFill"
        );


    if (!project) {
        return;
    }


    /* =========================
       TASK COUNTS
    ========================= */

    const totalTasks =
        projectTasks.length;


    const completedTasks =
        projectTasks.filter(
            task =>
                task.status === "Done"
        ).length;


    /* =========================
       PROJECT NAME
    ========================= */

    if (activeProjectName) {

        activeProjectName.textContent =
            project.name;

    }


    /* =========================
       PROGRESS TEXT
    ========================= */

    if (progressText) {

        progressText.textContent =
            `${completedTasks} of ${totalTasks} tasks done`;

    }


    /* =========================
       PERCENTAGE
    ========================= */

    const percentage =
        totalTasks === 0
            ? 0
            : Math.round(
                (
                    completedTasks /
                    totalTasks
                ) * 100
            );


    /* =========================
       PROGRESS BAR
    ========================= */

    if (progressBar) {

        progressBar.setAttribute(
            "aria-valuenow",
            percentage
        );

    }


    if (progressFill) {

        progressFill.style.width =
            `${percentage}%`;

    }

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        String(text ?? "");

    return div.innerHTML;

}
