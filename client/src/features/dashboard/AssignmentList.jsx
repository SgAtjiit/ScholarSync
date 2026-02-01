import { useState } from "react";
import GlassCard from "../../components/common/GlassCard";
import { Calendar, CheckCircle2, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 9;

const AssignmentList = ({ assignments, loading }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const totalPages = Math.ceil(assignments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAssignments = assignments.slice(startIndex, endIndex);

  // Reset to page 1 when assignments change
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 sm:h-48 rounded-2xl bg-zinc-900/50 animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 sm:py-20 bg-zinc-900/30 rounded-2xl sm:rounded-3xl border border-dashed border-zinc-800">
        <p className="text-zinc-500 text-base sm:text-lg">No assignments found for this filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-zinc-500">
          Showing {startIndex + 1}-{Math.min(endIndex, assignments.length)} of {assignments.length} assignments
        </p>
      </div>

      {/* Assignment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {paginatedAssignments.map((assignment) => (
        <GlassCard
          key={assignment._id}
          onClick={() => navigate(`/workspace/${assignment._id}`, { state: { assignment } })}
          className="group flex flex-col justify-between h-full"
        >
          <div>
            <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 sm:py-1 rounded-full border border-indigo-500/20 truncate max-w-[70%]">
                {assignment.courseName || assignment.courseId}
              </span>
              {assignment.status === 'submitted' ? (
                <CheckCircle2 size={16} className="flex-shrink-0 text-green-500" />
              ) : (
                <Clock size={16} className="flex-shrink-0 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-zinc-100 mb-1.5 sm:mb-2 leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors">
              {assignment.title}
            </h3>

            <p className="text-xs sm:text-sm text-zinc-500 line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-4">
              {assignment.description || "No description provided."}
            </p>
          </div>

          <div className="pt-3 sm:pt-4 border-t border-white/5 flex items-center justify-between gap-2">
            {assignment.status === 'submitted' && assignment.submissionInfo ? (
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 text-green-400 text-[10px] sm:text-xs font-medium">
                  <CheckCircle2 size={12} className="flex-shrink-0" />
                  <span className="truncate">Submitted {new Date(assignment.submissionInfo.submittedAt).toLocaleDateString()}</span>
                </div>
                {assignment.submissionInfo.driveFileLink && (
                  <a
                    href={assignment.submissionInfo.driveFileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] sm:text-xs text-indigo-400 hover:text-indigo-300 hover:underline truncate"
                  >
                    View Solution →
                  </a>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-400 text-[10px] sm:text-xs">
                  <Calendar size={12} className="flex-shrink-0" />
                  <span className="truncate">{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No Due Date'}</span>
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-white group-hover:translate-x-1 transition-transform whitespace-nowrap">
                  Open →
                </span>
              </>
            )}
          </div>
        </GlassCard>
      ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 pt-4">
          {/* Previous Button */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, idx) => (
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-zinc-500">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${
                    currentPage === page
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AssignmentList;