import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { LogOut, BookOpen, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast"

const Navbar = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleLogout = () => {
    toast.success("Logged out successfully!!")
    logout()
  }
  
  return (
    <nav className="h-14 sm:h-16 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50 px-3 sm:px-4 md:px-8">
      <div className="flex items-center justify-between h-full">
        <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3 group">
          <img src="/logo.png" alt="ScholarSync Logo" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all" />
          <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
            ScholarSync
          </span>
        </Link>

        {user && (
          <>
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <BookOpen size={16} /> Dashboard
                </Button>
              </Link>

              <div className="h-6 w-px bg-zinc-800 mx-1"></div>

              <div className="flex items-center gap-3">
                <div className="text-right">
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

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              {!localStorage.getItem("groq_api_key") && (
                <a href="/profile">
                  <span className="p-1.5 bg-orange-500/20 text-orange-400 rounded-lg">
                    <AlertTriangle size={14} />
                  </span>
                </a>
              )}
              <a href="/profile">
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-white/10"
                />
              </a>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {user && mobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-[#09090b]/95 backdrop-blur-lg border-b border-white/5 p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl">
            <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full border border-white/10" />
            <div>
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>
          
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <BookOpen size={18} /> Dashboard
          </Link>
          
          <Link
            to="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Sparkles size={18} /> Settings
          </Link>
          
          <button
            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
