import { useState } from "react";
import { Book, Calendar, AlertCircle, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2 } from "lucide-react";
import CoursePickerModal from "../../components/common/CoursePickerModal";

const CourseFilter = ({ 
  viewMode, 
  setViewMode, 
  courses, 
  selectedCourse, 
  setSelectedCourse,
  sortBy,
  setSortBy 
}) => {
  const [showCoursePicker, setShowCoursePicker] = useState(false);

  const filters = [
    { id: 'all', label: 'All', icon: Book },
    { id: 'assigned', label: 'Pending', icon: Calendar },
    { id: 'missing', label: 'Missing', icon: AlertCircle },
    { id: 'submitted', label: 'Done', icon: CheckCircle2 },
    { id: 'byCourse', label: 'By Course', icon: Book },
  ];

  const sortOptions = [
    { id: 'newest', label: 'Newest First', icon: ArrowDown },
    { id: 'oldest', label: 'Oldest First', icon: ArrowUp },
    { id: 'dueDate', label: 'Due Date', icon: Calendar },
    { id: 'title', label: 'Title A-Z', icon: ArrowUpDown },
  ];

  const selectedCourseName = courses.find(c => c.googleCourseId === selectedCourse)?.name;

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-zinc-900/80 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-white/5 overflow-x-auto scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => {
                  setViewMode(filter.id);
                  if (filter.id === 'byCourse') {
                    setShowCoursePicker(true);
                  }
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap ${
                  viewMode === filter.id
                    ? 'bg-zinc-800 text-white shadow-lg'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <filter.icon size={12} className="sm:w-4 sm:h-4" />
                <span>{filter.label}</span>
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-zinc-900/80 border border-white/5 text-[10px] sm:text-sm font-medium text-zinc-400 hover:text-white transition-all">
              <ArrowUpDown size={12} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Sort:</span>
              <span>{sortOptions.find(s => s.id === sortBy)?.label || 'Newest'}</span>
              <ChevronDown size={12} className="sm:w-4 sm:h-4" />
            </button>
            
            <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 min-w-[160px]">
              {sortOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSortBy(option.id)}
                  className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm flex items-center gap-2 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                    sortBy === option.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <option.icon size={14} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Course Badge */}
        {viewMode === 'byCourse' && (
          <button
            onClick={() => setShowCoursePicker(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-colors w-fit"
          >
            <Book size={14} />
            <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-none">
              {selectedCourseName || 'Select a course...'}
            </span>
            <ChevronDown size={14} />
          </button>
        )}
      </div>

      {/* Course Picker Modal */}
      <CoursePickerModal
        isOpen={showCoursePicker}
        onClose={() => setShowCoursePicker(false)}
        courses={courses}
        selectedCourse={selectedCourse}
        onSelect={(courseId) => {
          setSelectedCourse(courseId);
          if (!courseId) {
            setViewMode('all');
          }
        }}
      />
    </>
  );
};

export default CourseFilter;