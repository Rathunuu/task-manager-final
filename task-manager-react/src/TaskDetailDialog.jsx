import { useEffect, useRef, useState } from "react";

function TaskDetailDialog({ task, onClose, onUpdateField, onAddSubtask, onToggleSubtask, onDeleteSubtask }) {
  const dialogRef = useRef(null);
  const [subtaskText, setSubtaskText] = useState("");

  useEffect(() => {
    if (task && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
    if (!task && dialogRef.current && dialogRef.current.open) {
      dialogRef.current.close();
    }
  }, [task]);

  if (!task) return null;

  function handleAddSubtask() {
    if (subtaskText.trim() === "") return;
    onAddSubtask(task.id, subtaskText.trim());
    setSubtaskText("");
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-[min(550px,90%)] rounded-2xl border-none p-0 backdrop:bg-slate-900/50"
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900">{task.text}</h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Description
          </label>
          <textarea
            value={task.description || ""}
            onChange={(e) => onUpdateField(task.id, "description", e.target.value)}
            rows={3}
            className="w-full p-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Status
            </label>
            <select
              value={task.status}
              onChange={(e) => onUpdateField(task.id, "status", e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="In Review">In Review</option>
              <option value="Done">Done</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Priority
            </label>
            <select
              value={task.priority || "Normal"}
              onChange={(e) => onUpdateField(task.id, "priority", e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
            >
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={task.dueDate || ""}
              onChange={(e) => onUpdateField(task.id, "dueDate", e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Category
            </label>
            <select
              value={task.category}
              onChange={(e) => onUpdateField(task.id, "category", e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
            >
              <option value="Work">Work</option>
              <option value="Personal">Personal</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Notes
          </label>
          <textarea
            value={task.notes || ""}
            onChange={(e) => onUpdateField(task.id, "notes", e.target.value)}
            rows={3}
            className="w-full p-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Subtasks
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={subtaskText}
              onChange={(e) => setSubtaskText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
              placeholder="Add a subtask..."
              className="flex-1 p-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAddSubtask}
              className="px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              Add
            </button>
          </div>

          {(task.subtasks || []).map((sub) => (
            <div key={sub.id} className="flex items-center gap-2 py-1.5">
              <input
                type="checkbox"
                checked={sub.done}
                onChange={() => onToggleSubtask(task.id, sub.id)}
              />
              <span
                className={`flex-1 text-sm ${
                  sub.done ? "line-through text-slate-400" : "text-slate-700"
                }`}
              >
                {sub.text}
              </span>
              <button
                onClick={() => onDeleteSubtask(task.id, sub.id)}
                className="text-red-500 text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
}

export default TaskDetailDialog;