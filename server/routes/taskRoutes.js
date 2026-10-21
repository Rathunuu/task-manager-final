// ADMIN: assign a task to one or many users
router.post("/admin/assign", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { title, description, dueDate, priority, assignedTo } = req.body;

        // assignedTo array ah or single id ah irukkalaam
        const userIds = Array.isArray(assignedTo)
            ? assignedTo
            : assignedTo
            ? [assignedTo]
            : [];

        if (!title || !title.trim() || userIds.length === 0) {
            return res.status(400).json({
                message: "title and at least one user are required"
            });
        }

        const createdTasks = [];

        for (const userId of userIds) {
            // Ovvoru user ku "Assigned by Admin" project find pannu, illa na create pannu
            let project = await Project.findOne({
                owner: userId,
                name: "Assigned by Admin"
            });

            if (!project) {
                project = await Project.create({
                    name: "Assigned by Admin",
                    description: "Tasks assigned by admin",
                    owner: userId
                });
            }

            const task = await Task.create({
                title: title.trim(),
                description,
                dueDate,
                priority,
                project: project._id,
                assignedTo: userId,
                createdBy: req.user.userId
            });

            createdTasks.push(task);
        }

        res.status(201).json({
            message: `Task assigned to ${createdTasks.length} user(s)`,
            tasks: createdTasks
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to assign task",
            error: error.message
        });
    }
});
