import { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate  = useNavigate();
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

  const login = useGoogleLogin({
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.students https://www.googleapis.com/auth/drive.file email profile openid',
    onSuccess: async ({ code }) => {
      try {
        setLoading(true);
        const res = await api.post('/auth/google', { code });
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        // navigate('/')
      } catch (err) {
        console.error("Login failed", err);
        toast.error("Login failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => console.error("Google Login Failed")
  });

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);