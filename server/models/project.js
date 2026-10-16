// ADMIN: assign a task to a user
router.post("/admin/assign", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { title, description, dueDate, priority, assignedTo } = req.body;

        if (!title || !assignedTo) {
            return res.status(400).json({
                message: "title and assignedTo are required"
            });
        }

        // User oda "Assigned by Admin" project find pannu, illa na create pannu
        let project = await Project.findOne({
            owner: assignedTo,
            name: "Assigned by Admin"
        });

        if (!project) {
            project = await Project.create({
                name: "Assigned by Admin",
                description: "Tasks assigned by admin",
                owner: assignedTo
            });
        }

        const task = await Task.create({
            title,
            description,
            dueDate,
            priority,
            project: project._id,
            assignedTo,
            createdBy: req.user.userId
        });

        res.status(201).json({
            message: "Task assigned successfully",
            task
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to assign task",
            error: error.message
        });
    }
});
