import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { RefreshCw, BookOpen, Clock, AlertTriangle } from "lucide-react";
import Button from "../components/common/Button";
import StatCard from "../features/dashboard/StatCard";
import CourseFilter from "../features/dashboard/CourseFilter";
import AssignmentList from "../features/dashboard/AssignmentList";
import toast from 'react-hot-toast'; // ✨ ADDED

const Dashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const [viewMode, setViewMode] = useState('assigned');
  const [selectedCourse, setSelectedCourse] = useState('');

  // Stats calculation - now more accurate
  const [stats, setStats] = useState({
    submitted: '',
    missing: '',
    assigned: '',
    total: ''
  });

  useEffect(() => {
    fetchData();
  }, [viewMode, selectedCourse]);
  useEffect(() => {
    const stats = localStorage.getItem('scolar_sync_stats');
    if (stats) {
      setStats(JSON.parse(stats));
    }
  }, [])
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        mode: viewMode,
        ...(viewMode === 'byCourse' && selectedCourse && { courseId: selectedCourse })
      });

      // Fetch both in parallel
      const [assignRes, courseRes] = await Promise.all([
        api.get(`/classroom/assignments/${user._id}?${params}`),
        api.get(`/classroom/courses/${user._id}`)
      ]);

      setAssignments(assignRes.data);
      setCourses(courseRes.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data"); // ✨ ADDED
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setStats({
      submitted: '',
      missing: '',
      assigned: '',
      total: ''
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
        localStorage.setItem('scolar_sync_stats', JSON.stringify(stats));

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
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Welcome & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-4 flex justify-between items-end mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Welcome back, {user.name.split(' ')[0]}</h1>
            <p className="text-zinc-400">Here is your academic overview.</p>
          </div>
          <Button onClick={handleScan} loading={loading}>
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Sync
          </Button>
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
      />

      {/* List */}
      <AssignmentList assignments={assignments} loading={loading} />
    </div>
  );
};

export default Dashboard;