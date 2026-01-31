import { useAuth } from "../../context/AuthContext";
import { LogOut, Sparkles, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast"
const Navbar = () => {
  const { user, logout } = useAuth();
  const handleLogout = () => {
    toast.success("Logged out successfully!!")
    logout()
  }
  return (
    <nav className="h-16 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between">
      <Link to="/dashboard" className="flex items-center gap-3 group">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
          <Sparkles className="text-white" size={16} />
        </div>
        <span className="text-lg font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
          ScholarSync
        </span>
      </Link>

      {user && (
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <BookOpen size={16} /> Dashboard
            </Button>
          </Link>

          <div className="h-6 w-px bg-zinc-800 mx-1 hidden md:block"></div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-white">{user.name}</p>
              <p className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                {user.email}
              </p>
            </div>
            <a href="/profile">
              <img
                src={user.avatar}
                alt="Avatar"
                className="w-9 h-9 rounded-full border border-white/10 ring-2 ring-transparent hover:ring-indigo-500/50 transition-all cursor-pointer"
              />
            </a>

            {!localStorage.getItem("groq_api_key") && (
              <a href="/profile">
                <span
                  className="ml-2 px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded"
                  title="Groq API Key not set!"
                >
                  <AlertTriangle size={12} className="inline mr-1" /> API Key
                  Missing
                </span>
              </a>
            )}
            <button
              onClick={handleLogout}
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
