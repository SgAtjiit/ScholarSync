import GlassCard from "../../components/common/GlassCard";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AssignmentList = ({ assignments, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-zinc-900/50 animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
        <p className="text-zinc-500 text-lg">No assignments found for this filter.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assignments.map((assignment) => (
        <GlassCard
          key={assignment._id}
          onClick={() => navigate(`/workspace/${assignment._id}`, { state: { assignment } })}
          className="group flex flex-col justify-between h-full"
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20">
                {assignment.courseName || assignment.courseId}
              </span>
              {assignment.status === 'submitted' ? (
                <CheckCircle2 size={18} className="text-green-500" />
              ) : (
                <Clock size={18} className="text-zinc-600 group-hover:text-indigo-400 transition-colors" />
              )}
            </div>

            <h3 className="text-lg font-bold text-zinc-100 mb-2 leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors">
              {assignment.title}
            </h3>

            <p className="text-sm text-zinc-500 line-clamp-3 mb-4">
              {assignment.description || "No description provided."}
            </p>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            {assignment.status === 'submitted' && assignment.submissionInfo ? (
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                  <CheckCircle2 size={14} />
                  Submitted {new Date(assignment.submissionInfo.submittedAt).toLocaleDateString()}
                </div>
                {assignment.submissionInfo.driveFileLink && (
                  <a
                    href={assignment.submissionInfo.driveFileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                  >
                    View Solution PDF →
                  </a>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <Calendar size={14} />
                  {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No Due Date'}
                </div>
                <span className="text-xs font-medium text-white group-hover:translate-x-1 transition-transform">
                  Open Workspace →
                </span>
              </>
            )}
          </div>
        </GlassCard>
      ))}
    </div>
  );
};

export default AssignmentList;