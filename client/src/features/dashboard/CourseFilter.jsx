import { Book, Calendar, AlertCircle } from "lucide-react";

const CourseFilter = ({ viewMode, setViewMode, courses, selectedCourse, setSelectedCourse }) => {
  const filters = [
    { id: 'assigned', label: 'Assigned', icon: Calendar },
    { id: 'missing', label: 'Missing', icon: AlertCircle },
    { id: 'byCourse', label: 'By Course', icon: Book },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setViewMode(filter.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === filter.id
                ? 'bg-zinc-800 text-white shadow-lg'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <filter.icon size={16} />
            <span className="hidden sm:inline">{filter.label}</span>
          </button>
        ))}
      </div>

      {viewMode === 'byCourse' && (
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:w-64 p-2.5 outline-none"
        >
          <option value="">Select a specific course...</option>
          {courses.map((c) => (
            <option key={c.googleCourseId} value={c.googleCourseId}>
              {c.name} {c.section ? `(${c.section})` : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default CourseFilter;