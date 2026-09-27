import { useState } from "react";

function TaskList({ tasks, onOpenTask, onDeleteTask, onStatusChange, onReorder }) {
  const [draggedId, setDraggedId] = useState(null);

  function handleDragStart(id) {
    setDraggedId(id);
  }

  function handleDragOver(e, overId) {
    e.preventDefault();
    if (!draggedId || draggedId === overId) return;

    const ids = tasks.map((t) => t.id);
    const draggedIndex = ids.indexOf(draggedId);
    const overIndex = ids.indexOf(overId);
    if (draggedIndex === -1 || overIndex === -1) return;

    const newIds = [...ids];
    newIds.splice(draggedIndex, 1);
    newIds.splice(overIndex, 0, draggedId);
    onReorder(newIds);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDraggedId(null);
  }

  if (tasks.length === 0) {
    return (
      <p className="text-slate-400 text-sm py-6 text-center">
        No tasks found.
      </p>
    );
  }

  return (
    <ul className="list-none p-0 m-0 space-y-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          draggable
          onDragStart={() => handleDragStart(task.id)}
          onDragOver={(e) => handleDragOver(e, task.id)}
          onDrop={handleDrop}
          className={`flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-grab transition hover:border-slate-300 hover:shadow-sm ${
            draggedId === task.id ? "opacity-50" : ""
          }`}
        >
          <span onClick={() => onOpenTask(task.id)} className="flex-1 cursor-pointer">
            <strong className="text-sm text-slate-800">{task.text}</strong>{" "}
            <span className="text-xs text-slate-500">— {task.category}</span>
          </span>

          {task.assignedBy && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 whitespace-nowrap">
              Assigned by {task.assignedBy}
            </span>
          )}

          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="h-9 px-2 rounded-lg border border-slate-300 text-xs outline-none focus:border-blue-500"
          >
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Done">Done</option>
          </select>

          <button
            onClick={() => onDeleteTask(task.id)}
            className="text-red-500 hover:bg-red-50 text-xs font-semibold px-2 py-1.5 rounded-lg transition"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

export default TaskList;