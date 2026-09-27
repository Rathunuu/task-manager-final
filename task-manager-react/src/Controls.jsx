function Controls({
  searchText, onSearchChange,
  activeCategory, onCategoryChange,
  sortBy, onSortChange,
  currentView, onViewChange,
}) {
  const categories = ["All", "Work", "Personal", "Urgent"];

  return (
    <div className="flex flex-wrap items-center gap-3 my-4 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
      <input
        type="text"
        placeholder="Search tasks..."
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 min-w-[150px] h-10 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
      />

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeCategory === cat
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-blue-600"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="h-10 px-3 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
      >
        <option value="newest">Newest</option>
        <option value="az">A → Z</option>
      </select>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => onViewChange("list")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            currentView === "list"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-blue-600"
          }`}
        >
          List
        </button>
        <button
          onClick={() => onViewChange("board")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            currentView === "board"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-blue-600"
          }`}
        >
          Board
        </button>
      </div>
    </div>
  );
}

export default Controls;