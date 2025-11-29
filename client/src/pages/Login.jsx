import { useAuth } from "../context/AuthContext";
import { Sparkles } from "lucide-react";
import Button from "../components/common/Button";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // ✨ ADDED

const Login = () => {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user exists (login successful), go to dashboard
    if (user) {
      navigate('/dashboard');
      toast.success(`Welcome back, ${user.name}!`); // ✨ ADDED: Welcome Toast
    }
  }, [user, navigate]);

  // ✨ ADDED: Wrapper function to handle login errors
  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      toast.error("Login failed. Please try again.");
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#09090b] relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]" />

      <div className="z-10 bg-zinc-900/40 backdrop-blur-2xl border border-white/5 p-12 rounded-3xl shadow-2xl w-full max-w-md text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-500/20">
          <Sparkles className="text-white" size={40} />
        </div>

        <h1 className="text-4xl font-bold mb-3 text-white tracking-tight">ScholarSync</h1>
        <p className="text-zinc-400 mb-10 text-lg">Your AI-powered academic workspace.</p>

        <Button
          onClick={handleLogin} // ✨ UPDATED
          loading={loading}
          variant="white"
          className="w-full bg-white text-black hover:bg-zinc-200 border-none h-12 text-base"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-5 h-5 mr-2" alt="Google" />
          Sign in with Google
        </Button>

        <p className="mt-8 text-xs text-zinc-600">
          By continuing, you agree to access your Google Classroom data.
        </p>
      </div>
    </div>
  );
};

export default Login;