import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useSEO from "../hooks/useSEO";

const Login = () => {
  useSEO({ 
    title: 'Login', 
    description: 'Sign in to ScholarSync with your Google account to access the AI classroom manager.' 
  });

  const { login, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user exists (login successful), check if API key setup is needed
    if (user) {
      const hasApiKey = localStorage.getItem('groq_api_key');
      const hasCompletedSetup = localStorage.getItem('hasCompletedAPIKeySetup');
      
      if (!hasApiKey && !hasCompletedSetup) {
        // First time login - go to API key setup
        toast.success(`Welcome, ${user.name}! Let's set up your account.`);
        navigate('/api-key-setup');
      } else {
        // Returning user or already set up - go to dashboard
        toast.success(`Welcome back, ${user.name}!`);
        navigate('/dashboard');
      }
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] relative overflow-hidden px-4 py-8">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-indigo-600/20 rounded-full blur-[80px] sm:blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-purple-600/10 rounded-full blur-[60px] sm:blur-[100px]" />

      <div className="z-10 bg-zinc-900/40 backdrop-blur-2xl border border-white/5 p-6 sm:p-12 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md text-center">
        <img src="/logo.png" alt="ScholarSync Logo" className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl mx-auto mb-5 sm:mb-8 shadow-xl shadow-indigo-500/20" />

        <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-3 text-white tracking-tight">ScholarSync</h1>
        <p className="text-zinc-400 mb-6 sm:mb-10 text-sm sm:text-lg">Your AI-powered academic workspace.</p>

        <Button
          onClick={handleLogin}
          loading={loading}
          variant="white"
          className="w-full bg-white text-black hover:bg-zinc-200 border-none h-10 sm:h-12 text-sm sm:text-base"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" alt="Google" />
          Sign in with Google
        </Button>

        <p className="mt-5 sm:mt-8 text-[10px] sm:text-xs text-zinc-600">
          By continuing, you agree to access your Google Classroom data.
        </p>
      </div>
    </div>
  );
};

export default Login;