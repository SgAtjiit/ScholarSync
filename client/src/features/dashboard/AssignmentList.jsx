import { useState } from "react";
import GlassCard from "../../components/common/GlassCard";
import { Calendar, CheckCircle2, Clock, ChevronLeft, ChevronRight, FileText, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SkeletonCard } from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-4 w-48 bg-zinc-800/50 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i} 
              className="h-48 sm:h-56 rounded-2xl bg-zinc-900/50 border border-white/5 p-4 sm:p-6 space-y-4 animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex justify-between items-start">
                <div className="h-5 w-24 bg-zinc-800/50 rounded-full animate-pulse" />
                <div className="h-4 w-4 bg-zinc-800/50 rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-full bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-5 w-3/4 bg-zinc-800/50 rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-zinc-800/30 rounded animate-pulse" />
                <div className="h-3 w-4/5 bg-zinc-800/30 rounded animate-pulse" />
              </div>
              <div className="pt-4 border-t border-white/5 flex justify-between">
                <div className="h-3 w-24 bg-zinc-800/30 rounded animate-pulse" />
                <div className="h-3 w-12 bg-zinc-800/30 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No assignments found"
        description="Try syncing your Google Classroom or changing the filter to see assignments."
        variant="default"
        className="bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800"
      />
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