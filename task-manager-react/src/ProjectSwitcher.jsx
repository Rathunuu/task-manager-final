function ProjectSwitcher({ projects, activeProjectId, onSelectProject, onCreateProject }) {
  function handleNewProject() {
    const name = window.prompt("New project name:");
    if (name && name.trim() !== "") {
      onCreateProject(name.trim());
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => onSelectProject(project.id)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            project.id === activeProjectId
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {project.name}
        </button>
      ))}
      <button
        onClick={handleNewProject}
        className="px-4 py-2 rounded-lg text-sm font-semibold border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition"
      >
        + New Project
      </button>
    </div>
  );
}

export default ProjectSwitcher;