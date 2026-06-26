import { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { hasKeysSaved } from '../utils/keyManager';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // Check for persistent session
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data");
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);
  // Initial login with only standard non-sensitive scopes
  const login = useGoogleLogin({
    flow: 'auth-code',
    scope: 'email profile openid',
    prompt: 'consent',
    onSuccess: async ({ code }) => {
      try {
        setLoading(true);
        const res = await api.post('/auth/google', { code });
        setUser(res.data.user);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        // Check if this is first login (first time user without API key setup)
        const isFirstLogin = !localStorage.getItem('hasCompletedAPIKeySetup');
        if (isFirstLogin && !hasKeysSaved()) {
          // Mark that user has been to login
          localStorage.setItem('hasCompletedAPIKeySetup', 'false');
          // Redirect to API key setup
          navigate('/api-key-setup');
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error("Login failed", err);
        toast.error("Login failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => console.error("Google Login Failed")
  });

  // Secondary integration trigger for sensitive Google Classroom & Drive scopes
  const connectClassroom = useGoogleLogin({
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me https://www.googleapis.com/auth/classroom.student-submissions.me.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
    prompt: 'consent',
    onSuccess: async ({ code }) => {
      try {
        setLoading(true);
        const res = await api.post('/auth/connect-classroom', { code });
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        toast.success("Google Classroom & Drive synced successfully!");
      } catch (err) {
        console.error("Classroom sync failed", err);
        toast.error("Classroom sync failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      console.error("Classroom Sync Failed");
      toast.error("Classroom sync authorization failed.");
    }
  });

  const logout = async () => {
    try {
      setLoading(true);
      if (user?.hasClassroomConnected) {
        try {
          await api.post('/auth/disconnect-classroom');
        } catch (err) {
          console.error("Failed to disconnect classroom during logout:", err);
        }
      }
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLoading(false);
    }
  };

  const disconnectClassroom = async () => {
    try {
      setLoading(true);
      const res = await api.post('/auth/disconnect-classroom');
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success("Google Classroom & Drive disconnected successfully!");
    } catch (err) {
      console.error("Classroom disconnect failed", err);
      toast.error("Classroom disconnect failed. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, connectClassroom, disconnectClassroom, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);