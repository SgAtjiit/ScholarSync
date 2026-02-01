import { useEffect, useState, useMemo } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { RefreshCw, BookOpen, Clock, AlertTriangle } from "lucide-react";
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

  useEffect(() => {
    const stats = localStorage.getItem('scolar_sync_stats');
    if (stats) {
      setStats(JSON.parse(stats));
    }
  }, []);

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

      // Fetch both in parallel
      const [assignRes, courseRes] = await Promise.all([
        api.get(`/classroom/assignments/${user._id}?${params}`),
        api.get(`/classroom/courses/${user._id}`)
      ]);

      setAssignments(assignRes.data);
      setCourses(courseRes.data);
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
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12 px-2 sm:px-0">
      {/* Welcome & Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <div className="col-span-2 sm:col-span-2 md:col-span-4 flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">Welcome back, {user.name.split(' ')[0]}</h1>
            <p className="text-sm sm:text-base text-zinc-400">Here is your academic overview.</p>
          </div>
          <Button
            loading={loading}
            onClick={handleScan}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? null : <RefreshCw className="mr-2" size={16} />}
            Sync
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
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* List */}
      <AssignmentList assignments={sortedAssignments} loading={loading} />
    </div>
  );
};

export default Dashboard;