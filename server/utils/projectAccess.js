// All "who is allowed to do what on a project" rules live in this one file,
// so the routes never compare a user to a project field by hand.
//
//   member -> can see the project and work with its tasks
//   owner  -> can do everything a member can, plus manage members and
//             edit / delete the project itself
//   global admin (User.role === "admin") -> may also manage members of any
//             project

import mongoose from "mongoose";
import Project from "../models/project.js";
import User from "../models/user.js";

// Find a project by id. Returns null for a bad id or a missing project.
export async function loadProject(projectId) {
    if (!mongoose.isValidObjectId(projectId)) {
        return null;
    }

    return Project.findById(projectId);
}

// Is this user a site-wide admin? (role is read from the database)
export async function isGlobalAdmin(userId) {
    const user = await User.findById(userId).select("role");

    return Boolean(user && user.role === "admin");
}

// Member OR owner: may see the project and work with its tasks
export function canWorkInProject(project, userId) {
    return Boolean(project && project.isMember(userId));
}

// Owner (or global admin): may add / remove members
export async function canManageMembers(project, userId) {
    if (!project) {
        return false;
    }

    if (project.isOwner(userId)) {
        return true;
    }

    return isGlobalAdmin(userId);
}

// Ids of every project this user is a member of
export async function memberProjectIds(userId) {
    return Project.find({ "members.user": userId }).distinct("_id");
}
