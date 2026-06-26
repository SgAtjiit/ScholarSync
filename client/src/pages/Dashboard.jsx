import { useEffect, useState, useMemo } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { RefreshCw, BookOpen, Clock, AlertTriangle, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import StatCard from "../features/dashboard/StatCard";
import CourseFilter from "../features/dashboard/CourseFilter";
import AssignmentList from "../features/dashboard/AssignmentList";
import toast from 'react-hot-toast';
import useSEO from "../hooks/useSEO";

const Dashboard = () => {
  useSEO({ 
    title: 'Dashboard', 
    description: 'View and manage all your Google Classroom assignments with ScholarSync AI classroom manager.' 
  });

  const { user } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', courseName: '', dueDate: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssignment.title.trim()) {
      toast.error("Assignment title is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/classroom/assignments/manual', {
        title: newAssignment.title.trim(),
        courseName: newAssignment.courseName.trim(),
        dueDate: newAssignment.dueDate || null,
        description: newAssignment.description.trim()
      });
      toast.success("Assignment created!");
      setShowModal(false);
      setNewAssignment({ title: '', courseName: '', dueDate: '', description: '' });
      navigate(`/workspace/${res.data._id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const [viewMode, setViewMode] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Stats calculation
  const [stats, setStats] = useState({
    submitted: 'NA',
    missing: 'NA',
    assigned: 'NA',
    total: 'NA'
  });

  useEffect(() => {
    fetchData();
  }, [viewMode, selectedCourse]);


  // Client-side sorting
  const sortedAssignments = useMemo(() => {
    const sorted = [...assignments];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'dueDate':
        return sorted.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
      case 'title':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      default:
        return sorted;
    }
  }, [assignments, sortBy]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        mode: viewMode,
        ...(viewMode === 'byCourse' && selectedCourse && { courseId: selectedCourse })
      });

      // Fetch assignments, courses, and stats in parallel
      const [assignRes, courseRes, statsRes] = await Promise.all([
        api.get(`/classroom/assignments/${user._id}?${params}`),
        api.get(`/classroom/courses/${user._id}`),
        api.get(`/classroom/stats/${user._id}`)
      ]);

      setAssignments(assignRes.data);
      setCourses(courseRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setStats({
      submitted: 'NA',
      missing: 'NA',
      assigned: 'NA',
      total: 'NA'
    });
    const confirmScan = window.confirm("Scanning scans all courses. This might take a moment. Continue?");
    if (!confirmScan) return;

    setLoading(true);

    // ✨ ADDED: Loading toast
    const toastId = toast.loading("Syncing with Google Classroom...");

    try {
      const results = await api.post('/classroom/scan', { userId: user._id });
      const { success, stats } = results.data;
      if (success === true) {
        setStats(stats);

        // ✨ ADDED: Success Toast
        toast.success("Sync complete! Dashboard updated.", { id: toastId });
      }
      fetchData();
    } catch (err) {
      // ✨ ADDED: Error Toast
      toast.error("Scan failed. Please try again.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12 px-2 sm:px-0">
      {/* Onboarding Banner when Google Classroom is not connected */}
      {!user.hasClassroomConnected && (
        <div className="relative overflow-hidden rounded-2xl bg-indigo-600/10 border border-indigo-500/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <AlertTriangle className="text-indigo-400 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-semibold text-indigo-200">Google Classroom Sync is Optional</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Connect your Google Classroom & Drive to pull coursework directly. You can also create manual assignments and upload files manually.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all text-center"
          >
            Connect Classroom
          </button>
        </div>
      )}

      {/* Welcome & Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <div className="col-span-2 sm:col-span-2 md:col-span-4 flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">Welcome back, {user.name.split(' ')[0]}</h1>
            <p className="text-sm sm:text-base text-zinc-400">Here is your academic overview.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setShowModal(true)}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2" size={16} />
              Create Assignment
            </Button>
            {user.hasClassroomConnected && (
              <Button
                loading={loading}
                onClick={handleScan}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? null : <RefreshCw className="mr-2" size={16} />}
                Sync
              </Button>
            )}
          </div>
        </div>

        <StatCard label="Total" value={stats.total} icon={BookOpen} colorClass="text-blue-400" bgClass="bg-blue-500/10" />
        <StatCard label="Assigned" value={stats.assigned} icon={BookOpen} colorClass="text-blue-400" bgClass="bg-blue-500/10" />
        <StatCard label="Missing" value={stats.missing} icon={AlertTriangle} colorClass="text-orange-400" bgClass="bg-orange-500/10" />
        <StatCard label="Completed" value={stats.submitted} icon={Clock} colorClass="text-green-400" bgClass="bg-green-500/10" />
      </div>

      {/* Filters */}
      <CourseFilter
        viewMode={viewMode}
        setViewMode={setViewMode}
        courses={courses}
        selectedCourse={selectedCourse}
        setSelectedCourse={setSelectedCourse}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* List */}
      <AssignmentList assignments={sortedAssignments} loading={loading} />

      {/* Create Manual Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl animate-scale-in">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="text-indigo-500" size={20} />
              Create Assignment
            </h2>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physics Lab 3: Electromagnetic Induction"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Course Name
                </label>
                <input
                  type="text"
                  list="courses-list"
                  placeholder="e.g. Physics 101 (defaults to 'Manual Assignments')"
                  value={newAssignment.courseName}
                  onChange={(e) => setNewAssignment({ ...newAssignment, courseName: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <datalist id="courses-list">
                  {courses.map(course => (
                    <option key={course._id} value={course.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={newAssignment.dueDate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Describe the assignment or instructions..."
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/50 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                  className="w-full sm:w-auto"
                >
                  Create & Open Workspace
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;