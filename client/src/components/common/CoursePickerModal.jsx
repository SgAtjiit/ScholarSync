import { useState, useMemo } from 'react';
import { X, Search, Book, CheckCircle2 } from 'lucide-react';
import Button from './Button';

const CoursePickerModal = ({ isOpen, onClose, courses, selectedCourse, onSelect }) => {
    const [search, setSearch] = useState('');

    const filteredCourses = useMemo(() => {
        if (!search.trim()) return courses;
        const query = search.toLowerCase();
        return courses.filter(c => 
            c.name?.toLowerCase().includes(query) || 
            c.section?.toLowerCase().includes(query)
        );
    }, [courses, search]);

    if (!isOpen) return null;

    const handleSelect = (courseId) => {
        onSelect(courseId);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-zinc-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:mx-4 overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Book className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Select Course</h2>
                            <p className="text-xs text-zinc-500">{courses.length} courses available</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-zinc-800 text-white text-sm pl-10 pr-4 py-2.5 rounded-xl border border-white/5 focus:border-indigo-500 focus:outline-none placeholder-zinc-500"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Course List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {/* All Courses Option */}
                    <button
                        onClick={() => handleSelect('')}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                            !selectedCourse
                                ? 'bg-indigo-600 text-white'
                                : 'hover:bg-zinc-800 text-zinc-300'
                        }`}
                    >
                        <div className={`p-2 rounded-lg ${!selectedCourse ? 'bg-white/20' : 'bg-zinc-800'}`}>
                            <Book size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">All Courses</p>
                            <p className={`text-xs ${!selectedCourse ? 'text-indigo-200' : 'text-zinc-500'}`}>
                                Show assignments from all courses
                            </p>
                        </div>
                        {!selectedCourse && <CheckCircle2 size={18} className="flex-shrink-0" />}
                    </button>

                    {filteredCourses.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 text-sm">
                            No courses match your search
                        </div>
                    ) : (
                        filteredCourses.map((course) => {
                            const isSelected = selectedCourse === course.googleCourseId;
                            return (
                                <button
                                    key={course.googleCourseId}
                                    onClick={() => handleSelect(course.googleCourseId)}
                                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white'
                                            : 'hover:bg-zinc-800 text-zinc-300'
                                    }`}
                                >
                                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-zinc-800'}`}>
                                        <Book size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{course.name}</p>
                                        {course.section && (
                                            <p className={`text-xs truncate ${isSelected ? 'text-indigo-200' : 'text-zinc-500'}`}>
                                                {course.section}
                                            </p>
                                        )}
                                    </div>
                                    {isSelected && <CheckCircle2 size={18} className="flex-shrink-0" />}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-zinc-900/50">
                    <Button onClick={onClose} variant="secondary" className="w-full">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CoursePickerModal;
