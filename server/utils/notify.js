import Notification from "../models/Notification.js";

// Create a notification for each person in `users`.
//
// Rules, kept in this one place:
//   - the person who caused the event (actor) is never notified about
//     their own action
//   - the same person is notified only once, even if listed twice
//   - a failure here must never break the real action (posting a comment,
//     assigning a task...), so errors are swallowed and logged
export async function notify({
    users,
    actor,
    type,
    message,
    task = null,
    project = null
}) {
    try {
        const recipients = [
            ...new Set(
                (users || [])
                    .filter(Boolean)
                    .map(String)
                    .filter((id) => id !== String(actor))
            )
        ];

        if (recipients.length === 0) {
            return [];
        }

        return await Notification.insertMany(
            recipients.map((user) => ({
                user,
                actor,
                type,
                message,
                task,
                project
            }))
        );
    } catch (error) {
        console.error("Failed to create notification:", error.message);
        return [];
    }
}
