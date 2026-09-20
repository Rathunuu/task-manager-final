const STATUSES = ["To Do", "In Progress", "In Review", "Done"];

function Board({ tasks, onOpenTask, onStatusChange }) {
  function handleDrop(e, status) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      onStatusChange(taskId, status);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {STATUSES.map((status) => (
        <div
          key={status}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, status)}
          className="bg-slate-100 rounded-xl p-3 min-h-[300px]"
        >
          <h4 className="text-sm font-bold text-slate-700 mb-3">{status}</h4>

          {tasks
            .filter((t) => (t.status || "To Do") === status)
            .map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
                onClick={() => onOpenTask(task.id)}
                className="bg-white border border-slate-200 rounded-lg p-3 mb-2 cursor-grab hover:shadow-sm transition"
              >
                <strong className="text-xs text-slate-800">{task.text}</strong>
                <div className="text-[11px] text-slate-500 mt-1">
                  {task.category}
                </div>
                {task.assignedBy && (
                  <div className="text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                    Assigned by {task.assignedBy}
                  </div>
                )}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

export default Board;